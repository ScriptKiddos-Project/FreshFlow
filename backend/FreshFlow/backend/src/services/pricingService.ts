import { Ingredient } from '../models/Ingredient';
import { Order } from '../models/Order';
import { logger } from '../utils/logger';
import { io } from '../config/socket';
import mongoose from 'mongoose';

interface PriceFactors {
  demandScore: number;
  supplyScore: number;
  expiryUrgency: number;
  marketTrend: number;
  seasonality: number;
  competitivePrice: number;
}

interface PricingRule {
  factor: keyof PriceFactors;
  weight: number;
  minMultiplier: number;
  maxMultiplier: number;
}

export class PricingService {
  private readonly pricingRules: PricingRule[] = [
    { factor: 'demandScore', weight: 0.25, minMultiplier: 0.8, maxMultiplier: 1.4 },
    { factor: 'supplyScore', weight: 0.20, minMultiplier: 0.7, maxMultiplier: 1.3 },
    { factor: 'expiryUrgency', weight: 0.30, minMultiplier: 0.3, maxMultiplier: 1.0 },
    { factor: 'marketTrend', weight: 0.15, minMultiplier: 0.9, maxMultiplier: 1.2 },
    { factor: 'seasonality', weight: 0.10, minMultiplier: 0.85, maxMultiplier: 1.15 }
  ];

  // Calculate dynamic price for an ingredient
  async calculateDynamicPrice(ingredientId: string): Promise<number> {
    try {
      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      const basePrice = ingredient.basePrice || ingredient.originalPrice;
      const priceFactors = await this.calculatePriceFactors(ingredient);
      const dynamicPrice = this.applyPricingAlgorithm(basePrice, priceFactors);

      // Ensure price doesn't go below minimum viable price
      const minPrice = basePrice * 0.3;
      const maxPrice = basePrice * 2.0;

      const finalPrice = Math.max(minPrice, Math.min(maxPrice, dynamicPrice));

      logger.info(`Dynamic price calculated for ${ingredient.name}: ₹${finalPrice} (base: ₹${basePrice})`);

      return Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('Error calculating dynamic price:', error);
      throw error;
    }
  }

  // Calculate all price factors
  private async calculatePriceFactors(ingredient: any): Promise<PriceFactors> {
    const [demandScore, supplyScore, expiryUrgency, marketTrend, seasonality] = await Promise.all([
      this.calculateDemandScore(ingredient),
      this.calculateSupplyScore(ingredient),
      this.calculateExpiryUrgency(ingredient),
      this.calculateMarketTrend(ingredient),
      this.calculateSeasonality(ingredient)
    ]);

    return {
      demandScore,
      supplyScore,
      expiryUrgency,
      marketTrend,
      seasonality,
      competitivePrice: ingredient.basePrice || ingredient.originalPrice
    };
  }

  // Calculate demand score based on recent orders and views
  private async calculateDemandScore(ingredient: any): Promise<number> {
    try {
      const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get orders for this ingredient type in the area
      const recentOrders = await Order.aggregate([
        {
          $lookup: {
            from: 'ingredients',
            localField: 'ingredientId',
            foreignField: '_id',
            as: 'ingredient'
          }
        },
        {
          $match: {
            'ingredient.name': ingredient.name,
            'ingredient.category': ingredient.category,
            orderDate: { $gte: last7Days },
            status: { $in: ['delivered', 'in-transit', 'accepted'] }
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' },
            orderCount: { $sum: 1 },
            avgPrice: { $avg: '$pricePerUnit' }
          }
        }
      ]);

      const monthlyOrders = await Order.aggregate([
        {
          $lookup: {
            from: 'ingredients',
            localField: 'ingredientId',
            foreignField: '_id',
            as: 'ingredient'
          }
        },
        {
          $match: {
            'ingredient.name': ingredient.name,
            'ingredient.category': ingredient.category,
            orderDate: { $gte: last30Days },
            status: { $in: ['delivered', 'in-transit', 'accepted'] }
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' }
          }
        }
      ]);

      const weeklyDemand = recentOrders[0]?.totalQuantity || 0;
      const monthlyDemand = monthlyOrders[0]?.totalQuantity || 1;
      const orderFrequency = recentOrders[0]?.orderCount || 0;

      // Calculate demand intensity (0-1 scale)
      const demandIntensity = Math.min(1, weeklyDemand / (monthlyDemand * 0.25));
      const frequencyScore = Math.min(1, orderFrequency / 10);

      return (demandIntensity * 0.7 + frequencyScore * 0.3);
    } catch (error) {
      logger.error('Error calculating demand score:', error);
      return 0.5; // Default neutral score
    }
  }

  // Calculate supply score based on available quantity in the market
  private async calculateSupplyScore(ingredient: any): Promise<number> {
    try {
      // Get total available supply for this ingredient type
      const availableSupply = await Ingredient.aggregate([
        {
          $match: {
            name: ingredient.name,
            category: ingredient.category,
            isActive: true,
            quantity: { $gt: 0 },
            expiryDate: { $gt: new Date() }
          }
        },
        {
          $group: {
            _id: null,
            totalQuantity: { $sum: '$quantity' },
            vendorCount: { $sum: 1 },
            avgPrice: { $avg: '$currentPrice' }
          }
        }
      ]);

      const totalSupply = availableSupply[0]?.totalQuantity || 1;
      const vendorCount = availableSupply[0]?.vendorCount || 1;

      // Calculate supply abundance (inverse relationship with price)
      const supplyAbundance = Math.min(1, totalSupply / 1000); // Normalize to kg
      const competitionLevel = Math.min(1, vendorCount / 20); // Max expected vendors

      // High supply = lower price multiplier
      return 1 - (supplyAbundance * 0.6 + competitionLevel * 0.4);
    } catch (error) {
      logger.error('Error calculating supply score:', error);
      return 0.5; // Default neutral score
    }
  }

  // Calculate expiry urgency (higher urgency = lower price)
  private calculateExpiryUrgency(ingredient: any): number {
    try {
      const now = new Date();
      const expiryDate = new Date(ingredient.expiryDate);
      const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiry <= 0) {
        return 1; // Maximum urgency (expired)
      }

      // Urgency increases exponentially as expiry approaches
      if (hoursUntilExpiry <= 6) return 0.9;   // 90% discount
      if (hoursUntilExpiry <= 12) return 0.7;  // 70% of base price
      if (hoursUntilExpiry <= 24) return 0.5;  // 50% of base price
      if (hoursUntilExpiry <= 48) return 0.3;  // 30% discount
      if (hoursUntilExpiry <= 72) return 0.2;  // 20% discount

      return 0; // No urgency discount
    } catch (error) {
      logger.error('Error calculating expiry urgency:', error);
      return 0;
    }
  }

  // Calculate market trend based on historical price movements
  private async calculateMarketTrend(ingredient: any): Promise<number> {
    try {
      const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get average prices over time
      const priceHistory = await Order.aggregate([
        {
          $lookup: {
            from: 'ingredients',
            localField: 'ingredientId',
            foreignField: '_id',
            as: 'ingredient'
          }
        },
        {
          $match: {
            'ingredient.name': ingredient.name,
            'ingredient.category': ingredient.category,
            orderDate: { $gte: last30Days },
            status: 'delivered'
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$orderDate'
              }
            },
            avgPrice: { $avg: '$pricePerUnit' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } }
      ]);

      if (priceHistory.length < 2) {
        return 0; // No trend data
      }

      // Calculate price trend
      const prices = priceHistory.map(p => p.avgPrice);
      const recentPrice = prices.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, prices.length);
      const olderPrice = prices.slice(0, Math.max(1, prices.length - 7)).reduce((a, b) => a + b, 0) / Math.max(1, prices.length - 7);

      const trendRatio = recentPrice / olderPrice;
      
      // Convert trend to score (-0.2 to +0.2)
      return Math.max(-0.2, Math.min(0.2, (trendRatio - 1) * 0.5));
    } catch (error) {
      logger.error('Error calculating market trend:', error);
      return 0; // No trend adjustment
    }
  }

  // Calculate seasonality factor
  private calculateSeasonality(ingredient: any): number {
    try {
      const now = new Date();
      const month = now.getMonth(); // 0-11
      
      // Seasonal adjustments for common ingredients
      const seasonalFactors: Record<string, number[]> = {
        // [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
        'tomato': [0.1, 0.1, 0.05, -0.05, -0.1, -0.05, 0, 0.05, 0.1, 0.1, 0.05, 0.1],
        'onion': [0.05, 0.1, 0.15, 0.1, 0, -0.1, -0.15, -0.1, 0, 0.05, 0.1, 0.05],
        'potato': [0, 0.05, 0.1, 0.05, -0.05, -0.1, -0.05, 0, 0.05, 0.1, 0.05, 0],
        'green_chili': [-0.1, -0.05, 0, 0.1, 0.15, 0.1, 0.05, 0, -0.05, -0.1, -0.1, -0.1],
        // Add more ingredients as needed
      };

      const ingredientKey = ingredient.name.toLowerCase().replace(/\s+/g, '_');
      const factors = seasonalFactors[ingredientKey] || new Array(12).fill(0);

      return factors[month] || 0;
    } catch (error) {
      logger.error('Error calculating seasonality:', error);
      return 0;
    }
  }

  // Apply pricing algorithm with all factors
  private applyPricingAlgorithm(basePrice: number, factors: PriceFactors): number {
    let priceMultiplier = 1;

    // Apply each pricing rule
    for (const rule of this.pricingRules) {
      const factorValue = factors[rule.factor];
      const adjustedMultiplier = rule.minMultiplier + 
        (factorValue * (rule.maxMultiplier - rule.minMultiplier));
      
      priceMultiplier += (adjustedMultiplier - 1) * rule.weight;
    }

    return basePrice * priceMultiplier;
  }

  // Update prices for all active ingredients
  async updateAllPrices(): Promise<void> {
    try {
      const activeIngredients = await Ingredient.find({
        isActive: true,
        quantity: { $gt: 0 },
        expiryDate: { $gt: new Date() }
      });

      const updatePromises = activeIngredients.map(async (ingredient) => {
        try {
          const newPrice = await this.calculateDynamicPrice(ingredient._id.toString());
          const priceChange = ((newPrice - ingredient.currentPrice) / ingredient.currentPrice) * 100;

          // Only update if price change is significant (>2%)
          if (Math.abs(priceChange) > 2) {
            (ingredient as any).previousPrice = ingredient.currentPrice;
            ingredient.currentPrice = newPrice;
            (ingredient as any).priceUpdatedAt = new Date();

            await ingredient.save();

            // Emit real-time price update
            if (io) {
              io.emit('price_update', {
                ingredientId: ingredient._id,
                newPrice,
                previousPrice: (ingredient as any).previousPrice,
                priceChange: priceChange.toFixed(2)
              });

              // Notify vendor about significant price changes
              if (Math.abs(priceChange) > 10) {
                io.to(`vendor_${ingredient.vendorId}`).emit('price_alert', {
                  ingredientId: ingredient._id,
                  ingredientName: ingredient.name,
                  newPrice,
                  priceChange: priceChange.toFixed(2)
                });
              }
            }
          }
        } catch (error) {
          logger.error(`Error updating price for ingredient ${ingredient._id}:`, error);
        }
      });

      await Promise.all(updatePromises);
      logger.info(`Updated prices for ${activeIngredients.length} ingredients`);
    } catch (error) {
      logger.error('Error updating all prices:', error);
      throw error;
    }
  }

  // Get price prediction for next few hours
  async getPricePrediction(ingredientId: string, hours: number = 24): Promise<any[]> {
    try {
      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      const predictions = [];
      const currentTime = new Date();
      const basePrice = ingredient.basePrice || ingredient.originalPrice;

      for (let i = 1; i <= hours; i++) {
        const futureTime = new Date(currentTime.getTime() + i * 60 * 60 * 1000);
        
        // Simulate future ingredient state
        const futureIngredient = {
          ...ingredient.toObject(),
          expiryDate: ingredient.expiryDate
        };

        const futureFactors = await this.calculatePriceFactors(futureIngredient);
        
        // Adjust expiry urgency for future time
        const hoursUntilExpiry = (ingredient.expiryDate.getTime() - futureTime.getTime()) / (1000 * 60 * 60);
        futureFactors.expiryUrgency = this.calculateExpiryUrgencyFromHours(hoursUntilExpiry);

        const predictedPrice = this.applyPricingAlgorithm(basePrice, futureFactors);

        predictions.push({
          timestamp: futureTime,
          predictedPrice: Math.round(predictedPrice * 100) / 100,
          factors: futureFactors
        });
      }

      return predictions;
    } catch (error) {
      logger.error('Error generating price prediction:', error);
      throw error;
    }
  }

  // Helper method for expiry urgency calculation
  private calculateExpiryUrgencyFromHours(hoursUntilExpiry: number): number {
    if (hoursUntilExpiry <= 0) return 1;
    if (hoursUntilExpiry <= 6) return 0.9;
    if (hoursUntilExpiry <= 12) return 0.7;
    if (hoursUntilExpiry <= 24) return 0.5;
    if (hoursUntilExpiry <= 48) return 0.3;
    if (hoursUntilExpiry <= 72) return 0.2;
    return 0;
  }

  // Get pricing analytics
  async getPricingAnalytics(timeframe: string = '7d') {
    try {
      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const analytics = await Ingredient.aggregate([
        {
          $match: {
            priceUpdatedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$category',
            avgPriceIncrease: {
              $avg: {
                $divide: [
                  { $subtract: ['$currentPrice', '$previousPrice'] },
                  '$previousPrice'
                ]
              }
            },
            totalIngredients: { $sum: 1 },
            maxPriceChange: {
              $max: {
                $divide: [
                  { $subtract: ['$currentPrice', '$previousPrice'] },
                  '$previousPrice'
                ]
              }
            },
            minPriceChange: {
              $min: {
                $divide: [
                  { $subtract: ['$currentPrice', '$previousPrice'] },
                  '$previousPrice'
                ]
              }
            }
          }
        }
      ]);

      return analytics;
    } catch (error) {
      logger.error('Error getting pricing analytics:', error);
      throw error;
    }
  }

  // Get ingredients with urgent pricing (expiring soon)
  async getUrgentPricingIngredients() {
    try {
      const urgentIngredients = await Ingredient.find({
        isActive: true,
        quantity: { $gt: 0 },
        expiryDate: {
          $gte: new Date(),
          $lte: new Date(Date.now() + 48 * 60 * 60 * 1000)
        }
      })
      .populate('vendorId', 'name businessName phone')
      .sort({ expiryDate: 1 });

      return urgentIngredients.map(ingredient => {
        const hoursUntilExpiry = (ingredient.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60);
        const urgencyLevel = this.calculateExpiryUrgencyFromHours(hoursUntilExpiry);
        const basePrice = ingredient.basePrice || ingredient.originalPrice;
        const suggestedPrice = basePrice * (1 - urgencyLevel);

        return {
          ...ingredient.toObject(),
          hoursUntilExpiry: Math.round(hoursUntilExpiry),
          urgencyLevel,
          suggestedPrice: Math.round(suggestedPrice * 100) / 100,
          potentialSavings: Math.round((ingredient.currentPrice - suggestedPrice) * 100) / 100
        };
      });
    } catch (error) {
      logger.error('Error getting urgent pricing ingredients:', error);
      throw error;
    }
  }

  // Manual price override (for admin/vendor)
  async overridePrice(ingredientId: string, newPrice: number, reason: string, overrideBy: string) {
    try {
      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      const previousPrice = ingredient.currentPrice;
      (ingredient as any).previousPrice = previousPrice;
      ingredient.currentPrice = newPrice;
      (ingredient as any).priceUpdatedAt = new Date();
      (ingredient as any).priceOverride = {
        isOverridden: true,
        overridePrice: newPrice,
        reason,
        overrideBy,
        overrideDate: new Date()
      };

      await ingredient.save();

      // Log price override
      logger.info(`Price override for ${ingredient.name}: ₹${previousPrice} → ₹${newPrice} by ${overrideBy}`);

      // Emit real-time update
      if (io) {
        io.emit('price_update', {
          ingredientId: ingredient._id,
          newPrice,
          previousPrice,
          isOverride: true,
          reason
        });
      }

      return ingredient;
    } catch (error) {
      logger.error('Error overriding price:', error);
      throw error;
    }
  }

  // Remove price override
  async removeOverride(ingredientId: string) {
    try {
      const ingredient = await Ingredient.findById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      // Reset to dynamic pricing
      (ingredient as any).priceOverride = {
        isOverridden: false,
        overridePrice: null,
        reason: null,
        overrideBy: null,
        overrideDate: null
      };

      // Recalculate dynamic price
      const dynamicPrice = await this.calculateDynamicPrice(ingredientId);
      (ingredient as any).previousPrice = ingredient.currentPrice;
      ingredient.currentPrice = dynamicPrice;
      (ingredient as any).priceUpdatedAt = new Date();

      await ingredient.save();

      logger.info(`Price override removed for ${ingredient.name}, dynamic price: ₹${dynamicPrice}`);

      return ingredient;
    } catch (error) {
      logger.error('Error removing price override:', error);
      throw error;
    }
  }
}

export const pricingService = new PricingService();