import cron from 'node-cron';
import { Ingredient } from '../models/Ingredient';
import { Order } from '../models/Order';
import { logger } from '../utils/logger';
import { io } from '../config/socket';
import { getRedisClient } from '../config/redis';

interface PriceUpdateData {
  ingredientId: string;
  oldPrice: number;
  newPrice: number;
  factor: number;
  reason: string;
}

interface MarketData {
  demand: number;
  supply: number;
  avgPrice: number;
  volatility: number;
  seasonalFactor: number;
}

class PriceUpdater {
  private isRunning = false;
  private updateInterval = 5; // minutes
  private priceHistory: Map<string, number[]> = new Map();

  constructor() {
    this.initializePriceHistory();
  }

  /**
   * Initialize price history from Redis cache
   */
  private async initializePriceHistory(): Promise<void> {
    try {
      const redis = getRedisClient();
      const historyData = await redis.get('price_history');
      if (historyData) {
        this.priceHistory = new Map(JSON.parse(historyData));
      }
    } catch (error) {
      logger.error('Error initializing price history:', error);
    }
  }

  /**
   * Start the price update job
   */
  public startPriceUpdateJob(): void {
    // Run every 5 minutes
    cron.schedule(`*/${this.updateInterval} * * * *`, async () => {
      if (!this.isRunning) {
        await this.updateAllPrices();
      }
    });

    // Major price recalculation every hour
    cron.schedule('0 * * * *', async () => {
      await this.majorPriceRecalculation();
    });

    logger.info('Price update job started - Running every 5 minutes');
  }

  /**
   * Update prices for all active ingredients
   */
  private async updateAllPrices(): Promise<void> {
    this.isRunning = true;
    const startTime = Date.now();

    try {
      const activeIngredients = await Ingredient.find({
        status: 'active',
        quantity: { $gt: 0 },
        expiryDate: { $gt: new Date() }
      }).populate('seller', 'businessName location');

      logger.info(`Processing price updates for ${activeIngredients.length} ingredients`);

      const updatePromises = activeIngredients.map((ingredient) =>
        this.updateIngredientPrice(ingredient)
      );

      const updates = await Promise.allSettled(updatePromises);
      const successful = updates.filter(u => u.status === 'fulfilled').length;
      const failed = updates.filter(u => u.status === 'rejected').length;

  // Save price history to Redis (use project redis client)
  const redis = getRedisClient();
  await redis.setEx('price_history', 3600, JSON.stringify([...this.priceHistory]));

      const duration = Date.now() - startTime;
      logger.info(`Price update completed: ${successful} successful, ${failed} failed, ${duration}ms`);

      // Emit real-time price updates (guard in case socket isn't initialized)
      io?.emit('priceUpdates', {
        timestamp: new Date(),
        updated: successful,
        failed,
        duration
      });

    } catch (error) {
      logger.error('Error in price update job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Update price for a specific ingredient
   */
  private async updateIngredientPrice(ingredient: any): Promise<PriceUpdateData | null> {
    try {
      const marketData = await this.getMarketData(ingredient);
      const newPrice = await this.calculateDynamicPrice(ingredient, marketData);
      
      if (!newPrice || Math.abs(newPrice - ingredient.currentPrice) < 0.01) {
        return null; // No significant price change
      }

      const updateData: PriceUpdateData = {
        ingredientId: ingredient._id.toString(),
        oldPrice: ingredient.currentPrice,
        newPrice,
        factor: newPrice / ingredient.currentPrice,
        reason: this.getPriceChangeReason(ingredient, marketData, newPrice)
      };

      // Update ingredient price
      await Ingredient.findByIdAndUpdate(ingredient._id, {
        currentPrice: newPrice,
        priceHistory: [
          ...ingredient.priceHistory.slice(-19), // Keep last 20 entries
          {
            price: newPrice,
            timestamp: new Date(),
            reason: updateData.reason
          }
        ],
        lastPriceUpdate: new Date()
      });

      // Update price history cache
      const history = this.priceHistory.get(ingredient._id.toString()) || [];
      history.push(newPrice);
      if (history.length > 100) history.shift(); // Keep last 100 prices
      this.priceHistory.set(ingredient._id.toString(), history);

  // Emit real-time update to subscribers (guard in case socket isn't initialized)
  io?.to(`ingredient_${ingredient._id}`).emit('priceUpdate', updateData);

      logger.debug(`Price updated for ${ingredient.name}: ₹${ingredient.currentPrice} → ₹${newPrice}`);
      return updateData;

    } catch (error) {
      logger.error(`Error updating price for ingredient ${ingredient._id}:`, error);
      return null;
    }
  }

  /**
   * Get market data for price calculation
   */
  private async getMarketData(ingredient: any): Promise<MarketData> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get demand data (recent orders)
    const recentOrders = await Order.find({
      'items.ingredient': ingredient._id,
      createdAt: { $gte: last24h },
      status: { $in: ['pending', 'confirmed', 'completed'] }
    });

    const demand = recentOrders.reduce((sum, order) => {
      const item = order.items.find((i: any) => i.ingredient.toString() === ingredient._id.toString());
      return sum + (item ? item.quantity : 0);
    }, 0);

    // Get supply data (similar ingredients available)
    const similarIngredients = await Ingredient.find({
      name: ingredient.name,
      location: ingredient.location,
      status: 'active',
      quantity: { $gt: 0 },
      expiryDate: { $gt: now }
    });

    const supply = similarIngredients.reduce((sum, ing) => sum + ing.quantity, 0);

    // Calculate average market price
    const avgPrice = similarIngredients.length > 1 
      ? similarIngredients.reduce((sum, ing) => sum + ing.currentPrice, 0) / similarIngredients.length
      : ingredient.currentPrice;

    // Calculate price volatility
    const history = this.priceHistory.get(ingredient._id.toString()) || [ingredient.currentPrice];
    const volatility = this.calculateVolatility(history);

    // Seasonal factor based on ingredient type and month
    const seasonalFactor = this.getSeasonalFactor(ingredient.category, now.getMonth());

    return {
      demand,
      supply,
      avgPrice,
      volatility,
      seasonalFactor
    };
  }

  /**
   * Calculate dynamic price using multiple factors
   */
  private async calculateDynamicPrice(ingredient: any, marketData: MarketData): Promise<number> {
    const basePrice = ingredient.basePrice || ingredient.currentPrice;
    let priceMultiplier = 1.0;

    // 1. Supply-Demand Factor (40% weight)
    const demandSupplyRatio = marketData.supply > 0 ? marketData.demand / marketData.supply : 2;
    if (demandSupplyRatio > 1.5) {
      priceMultiplier += 0.15; // High demand, increase price
    } else if (demandSupplyRatio < 0.5) {
      priceMultiplier -= 0.10; // Low demand, decrease price
    }

    // 2. Expiry Urgency Factor (35% weight)
    const daysToExpiry = Math.ceil((ingredient.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysToExpiry <= 1) {
      priceMultiplier -= 0.40; // Urgent sale needed
    } else if (daysToExpiry <= 3) {
      priceMultiplier -= 0.25; // Significant discount
    } else if (daysToExpiry <= 7) {
      priceMultiplier -= 0.10; // Small discount
    }

    // 3. Quantity Factor (10% weight)
    const quantityRatio = ingredient.quantity / ingredient.originalQuantity;
    if (quantityRatio > 0.8) {
      priceMultiplier -= 0.05; // Bulk discount for high quantity
    } else if (quantityRatio < 0.2) {
      priceMultiplier += 0.08; // Premium for limited quantity
    }

    // 4. Market Price Alignment Factor (10% weight)
    const priceDeviation = (ingredient.currentPrice - marketData.avgPrice) / marketData.avgPrice;
    if (Math.abs(priceDeviation) > 0.2) {
      priceMultiplier += priceDeviation > 0 ? -0.05 : 0.05; // Align with market
    }

    // 5. Seasonal Factor (5% weight)
    priceMultiplier += (marketData.seasonalFactor - 1) * 0.05;

    // Apply bounds to prevent extreme price changes
    priceMultiplier = Math.max(0.4, Math.min(1.8, priceMultiplier));

    const newPrice = basePrice * priceMultiplier;
    
    // Round to 2 decimal places and ensure minimum price
    return Math.max(1, Math.round(newPrice * 100) / 100);
  }

  /**
   * Calculate price volatility from history
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * Get seasonal factor based on ingredient category and month
   */
  private getSeasonalFactor(category: string, month: number): number {
    const seasonalFactors: { [key: string]: number[] } = {
      'vegetables': [1.1, 1.0, 0.9, 0.8, 0.9, 1.2, 1.3, 1.2, 1.0, 0.9, 1.0, 1.1],
      'fruits': [1.2, 1.1, 0.9, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.1, 1.0, 1.2],
      'spices': [1.0, 1.0, 1.1, 1.2, 1.3, 1.1, 1.0, 1.0, 1.0, 1.1, 1.2, 1.1],
      'dairy': [1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
      'meat': [1.1, 1.0, 1.0, 1.0, 1.0, 1.0, 1.1, 1.1, 1.0, 1.0, 1.1, 1.2]
    };

    return seasonalFactors[category.toLowerCase()] ? 
           seasonalFactors[category.toLowerCase()][month] : 1.0;
  }

  /**
   * Get human-readable reason for price change
   */
  private getPriceChangeReason(ingredient: any, marketData: MarketData, newPrice: number): string {
    const oldPrice = ingredient.currentPrice;
    const change = ((newPrice - oldPrice) / oldPrice) * 100;

    if (Math.abs(change) < 2) return 'Minor market adjustment';

    const daysToExpiry = Math.ceil((ingredient.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const demandSupplyRatio = marketData.supply > 0 ? marketData.demand / marketData.supply : 2;

    if (change < -20) return 'Urgent clearance - expiring soon';
    if (change < -10) return daysToExpiry <= 3 ? 'Quick sale needed' : 'Low market demand';
    if (change < -5) return 'Market price alignment';
    if (change > 15) return 'High demand surge';
    if (change > 5) return demandSupplyRatio > 1.5 ? 'Strong demand' : 'Limited supply';
    
    return 'Standard market fluctuation';
  }

  /**
   * Major price recalculation with market analysis
   */
  private async majorPriceRecalculation(): Promise<void> {
    logger.info('Starting major price recalculation...');
    
    try {
      // Update base prices based on market trends
      const ingredients = await Ingredient.find({
        status: 'active',
        lastPriceUpdate: { $lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } // 6 hours old
      });

      for (const ingredient of ingredients) {
        const marketTrend = await this.analyzeMarketTrend(ingredient);
        
        if (Math.abs(marketTrend) > 0.1) { // 10% trend
          await Ingredient.findByIdAndUpdate(ingredient._id, {
            basePrice: (ingredient.basePrice ?? ingredient.currentPrice) * (1 + marketTrend * 0.5), // Adjust base price by 50% of trend
            lastMajorUpdate: new Date()
          });
        }
      }

      logger.info('Major price recalculation completed');
    } catch (error) {
      logger.error('Error in major price recalculation:', error);
    }
  }

  /**
   * Analyze market trend for an ingredient
   */
  private async analyzeMarketTrend(ingredient: any): Promise<number> {
    const history = this.priceHistory.get(ingredient._id.toString()) || [];
    if (history.length < 10) return 0;

    // Calculate trend using linear regression
    const n = history.length;
    const x = Array.from({length: n}, (_, i) => i);
    const y = history;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const avgY = sumY / n;

    return slope / avgY; // Normalized trend
  }

  /**
   * Stop the price update job
   */
  public stopPriceUpdateJob(): void {
    this.isRunning = false;
    logger.info('Price update job stopped');
  }

  /**
   * Manual price update trigger
   */
  public async triggerManualUpdate(ingredientId?: string): Promise<void> {
    if (ingredientId) {
      const ingredient = await Ingredient.findById(ingredientId).populate('seller');
      if (ingredient) {
        await this.updateIngredientPrice(ingredient);
      }
    } else {
      await this.updateAllPrices();
    }
  }
}

export const priceUpdater = new PriceUpdater();