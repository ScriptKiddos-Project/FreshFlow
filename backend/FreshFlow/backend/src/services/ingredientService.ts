import { Ingredient } from '../models/Ingredient';
import { User } from '../models/User';
import { pricingService } from './pricingService';
import { notificationService } from './notificationService';
import { logger } from '../utils/logger';
import { redisClient, getRedisClient } from '../config/redis';
import mongoose from 'mongoose';

export interface IngredientSearchQuery {
  category?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius?: number;
  };
  priceRange?: {
    min: number;
    max: number;
  };
  expiryRange?: {
    minHours: number;
    maxHours: number;
  };
  quality?: 'excellent' | 'good' | 'fair';
  organic?: boolean;
  sortBy?: 'price' | 'distance' | 'expiry' | 'quality' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface CreateIngredientData {
  name: string;
  category: string;
  subcategory?: string;
  quantity: number;
  unit: 'kg' | 'grams' | 'liters' | 'pieces' | 'bunches';
  originalPrice: number;
  currentPrice?: number;
  minPrice: number;
  purchasedDate: Date;
  expiryDate: Date;
  quality: 'excellent' | 'good' | 'fair';
  organic: boolean;
  description?: string;
  images?: string[];
  storageConditions?: string;
  tags?: string[];
  status?: 'available' | 'reserved' | 'sold' | 'expired';
}

export interface UpdateIngredientData extends Partial<CreateIngredientData> {
  status?: 'available' | 'reserved' | 'sold' | 'expired';
}

export class IngredientService {
  /**
   * Create new ingredient listing
   */
  async createIngredient(vendorId: string, ingredientData: CreateIngredientData) {
    try {
      const vendor = await User.findById(vendorId);
      if (!vendor || (vendor as any).status !== 'active') {
        throw new Error('Vendor not found or inactive');
      }

      // Calculate initial pricing
      const initialPrice = ingredientData.currentPrice || ingredientData.originalPrice;

      const ingredient = new Ingredient({
        ...ingredientData,
        vendorId,
        currentPrice: initialPrice,
        priceHistory: [{
          price: initialPrice,
          timestamp: new Date(),
          reason: 'initial_listing'
        }],
        viewCount: 0,
        interestedBuyers: [],
        status: ingredientData.status || 'available',
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      await ingredient.save();

      await this.schedulePriceUpdates(ingredient._id.toString());
      await this.cacheIngredient(ingredient);

      logger.info(`New ingredient created: ${ingredient.name} by vendor ${vendorId}`);

      await this.notifyNearbyVendors(ingredient);

      return ingredient;
    } catch (error) {
      logger.error('Error creating ingredient:', error);
      throw error;
    }
  }

  /**
   * Search ingredients with advanced filtering
   */
  async searchIngredients(query: IngredientSearchQuery, requestingUserId?: string) {
    try {
      const {
        category,
        location,
        priceRange,
        expiryRange,
        quality,
        organic,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 20
      } = query;

      const pipeline: any[] = [
        {
          $match: {
            isAvailable: true,
            expiryDate: { $gt: new Date() }
          }
        }
      ];

      if (category) {
        pipeline[0].$match.category = category;
      }

      if (priceRange) {
        pipeline[0].$match.currentPrice = {
          $gte: priceRange.min,
          $lte: priceRange.max
        };
      }

      if (expiryRange) {
        const now = new Date();
        const minExpiryDate = new Date(now.getTime() + expiryRange.minHours * 60 * 60 * 1000);
        const maxExpiryDate = new Date(now.getTime() + expiryRange.maxHours * 60 * 60 * 1000);
        
        pipeline[0].$match.expiryDate = {
          $gte: minExpiryDate,
          $lte: maxExpiryDate
        };
      }

      if (quality) {
        pipeline[0].$match.quality = quality;
      }

      if (organic !== undefined) {
        pipeline[0].$match.organic = organic;
      }

      if (location) {
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        });

        pipeline.push({
          $addFields: {
            distance: {
              $sqrt: {
                $add: [
                  {
                    $pow: [
                      {
                        $multiply: [
                          { $subtract: [{ $arrayElemAt: ['$vendor.address.coordinates.latitude', 0] }, location.latitude] },
                          111.32
                        ]
                      },
                      2
                    ]
                  },
                  {
                    $pow: [
                      {
                        $multiply: [
                          {
                            $multiply: [
                              { $subtract: [{ $arrayElemAt: ['$vendor.address.coordinates.longitude', 0] }, location.longitude] },
                              111.32
                            ]
                          },
                          { $cos: { $multiply: [location.latitude, Math.PI / 180] } }
                        ]
                      },
                      2
                    ]
                  }
                ]
              }
            }
          }
        });

        if (location.radius) {
          pipeline.push({
            $match: {
              distance: { $lte: location.radius }
            }
          });
        }
      }

      if (!location) {
        pipeline.push({
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        });
      }

      pipeline.push({
        $addFields: {
          popularityScore: { $add: ['$viewCount', { $multiply: [{ $size: '$interestedBuyers' }, 2] }] },
          hoursToExpiry: {
            $divide: [
              { $subtract: ['$expiryDate', new Date()] },
              3600000
            ]
          }
        }
      });

      const sortStage: any = {};
      switch (sortBy) {
        case 'price':
          sortStage.currentPrice = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'distance':
          if (location) {
            sortStage.distance = 1;
          } else {
            sortStage.createdAt = -1;
          }
          break;
        case 'expiry':
          sortStage.expiryDate = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'quality':
          pipeline.push({
            $addFields: {
              qualityRank: {
                $switch: {
                  branches: [
                    { case: { $eq: ['$quality', 'excellent'] }, then: 3 },
                    { case: { $eq: ['$quality', 'good'] }, then: 2 },
                    { case: { $eq: ['$quality', 'fair'] }, then: 1 }
                  ],
                  default: 0
                }
              }
            }
          });
          sortStage.qualityRank = sortOrder === 'asc' ? 1 : -1;
          break;
        case 'popularity':
          sortStage.popularityScore = sortOrder === 'asc' ? 1 : -1;
          break;
        default:
          sortStage.createdAt = sortOrder === 'asc' ? 1 : -1;
      }

      pipeline.push({ $sort: sortStage });
      pipeline.push({ $skip: (page - 1) * limit });
      pipeline.push({ $limit: limit });

      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          category: 1,
          subcategory: 1,
          quantity: 1,
          unit: 1,
          originalPrice: 1,
          currentPrice: 1,
          minPrice: 1,
          expiryDate: 1,
          quality: 1,
          organic: 1,
          description: 1,
          images: 1,
          tags: 1,
          viewCount: 1,
          interestedBuyers: 1,
          createdAt: 1,
          distance: 1,
          hoursToExpiry: 1,
          popularityScore: 1,
          vendor: {
            _id: 1,
            name: 1,
            businessName: 1,
            address: 1,
            rating: 1,
            totalSales: 1
          }
        }
      });

      const [results, totalCount] = await Promise.all([
        Ingredient.aggregate(pipeline),
        this.getSearchResultsCount(query)
      ]);

      if (requestingUserId) {
        await this.incrementViewCounts(results.map(r => r._id), requestingUserId);
      }

      return {
        ingredients: results,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalResults: totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error searching ingredients:', error);
      throw error;
    }
  }

  /**
   * Get ingredient by ID
   */
  async getIngredientById(ingredientId: string, requestingUserId?: string) {
    try {
      const ingredient = await Ingredient.findById(ingredientId)
        .populate('vendorId', 'name businessName address rating totalSales phone')
        .lean();

      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      if (!(ingredient as any).isAvailable) {
        throw new Error('Ingredient is no longer available');
      }

      if (requestingUserId && requestingUserId !== (ingredient as any).vendorId.toString()) {
        await this.incrementViewCount(ingredientId, requestingUserId);
      }

      const hoursToExpiry = (new Date((ingredient as any).expiryDate).getTime() - Date.now()) / (1000 * 60 * 60);
      
      return {
        ...ingredient,
        hoursToExpiry: Math.max(0, hoursToExpiry),
        discountPercentage: Math.round((((ingredient as any).originalPrice - (ingredient as any).currentPrice) / (ingredient as any).originalPrice) * 100)
      };
    } catch (error) {
      logger.error('Error fetching ingredient:', error);
      throw error;
    }
  }

  /**
   * Update ingredient
   */
  async updateIngredient(ingredientId: string, vendorId: string, updateData: UpdateIngredientData) {
    try {
      const ingredient = await Ingredient.findOne({
        _id: ingredientId,
        vendorId
      });

      if (!ingredient) {
        throw new Error('Ingredient not found or you do not have permission to update it');
      }

      const status = (ingredient as any).status;
      if (status === 'sold' || status === 'expired') {
        throw new Error('Cannot update sold or expired ingredient');
      }

      if (updateData.currentPrice && updateData.currentPrice !== (ingredient as any).currentPrice) {
        if (updateData.minPrice && updateData.currentPrice < updateData.minPrice) {
          throw new Error('Price cannot be below minimum price');
        }

        (ingredient as any).priceHistory.push({
          price: updateData.currentPrice,
          timestamp: new Date(),
          reason: 'manual_update'
        });
      }

      Object.keys(updateData).forEach(key => {
        if ((updateData as any)[key] !== undefined) {
          (ingredient as any)[key] = (updateData as any)[key];
        }
      });

      (ingredient as any).updatedAt = new Date();
      await ingredient.save();

      await this.cacheIngredient(ingredient);

      if (updateData.expiryDate) {
        await this.schedulePriceUpdates(ingredientId);
      }

      logger.info(`Ingredient updated: ${ingredientId} by vendor ${vendorId}`);

      return ingredient;
    } catch (error) {
      logger.error('Error updating ingredient:', error);
      throw error;
    }
  }

  /**
   * Delete ingredient
   */
  async deleteIngredient(ingredientId: string, vendorId: string) {
    try {
      const ingredient = await Ingredient.findOne({
        _id: ingredientId,
        vendorId
      });

      if (!ingredient) {
        throw new Error('Ingredient not found or you do not have permission to delete it');
      }

      (ingredient as any).status = 'removed';
      (ingredient as any).updatedAt = new Date();
      await ingredient.save();

      await this.removeCachedIngredient(ingredientId);

      logger.info(`Ingredient deleted: ${ingredientId} by vendor ${vendorId}`);

      return { message: 'Ingredient deleted successfully' };
    } catch (error) {
      logger.error('Error deleting ingredient:', error);
      throw error;
    }
  }

  /**
   * Get vendor's ingredients
   */
  async getVendorIngredients(vendorId: string, filters?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const {
        status,
        category,
        page = 1,
        limit = 20
      } = filters || {};

      const query: any = { vendorId };
      
      if (status) {
        query.status = status;
      }
      
      if (category) {
        query.category = category;
      }

      const [ingredients, totalCount] = await Promise.all([
        Ingredient.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Ingredient.countDocuments(query)
      ]);

      const enrichedIngredients = ingredients.map((ingredient: any) => {
        const hoursToExpiry = (new Date(ingredient.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60);
        return {
          ...ingredient,
          hoursToExpiry: Math.max(0, hoursToExpiry),
          discountPercentage: Math.round(((ingredient.originalPrice - ingredient.currentPrice) / ingredient.originalPrice) * 100)
        };
      });

      return {
        ingredients: enrichedIngredients,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          totalResults: totalCount,
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPrevPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching vendor ingredients:', error);
      throw error;
    }
  }

  /**
   * Get trending ingredients
   */
  async getTrendingIngredients(limit: number = 10) {
    try {
      const cacheKey = `trending_ingredients:${limit}`;
      
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const trending = await Ingredient.aggregate([
        {
          $match: {
            isAvailable: true,
            expiryDate: { $gt: new Date() },
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $addFields: {
            trendingScore: {
              $add: [
                '$viewCount',
                { $multiply: [{ $size: '$interestedBuyers' }, 3] },
                { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] }
              ]
            }
          }
        },
        {
          $sort: { trendingScore: -1 }
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'users',
            localField: 'vendorId',
            foreignField: '_id',
            as: 'vendor'
          }
        },
        {
          $project: {
            name: 1,
            category: 1,
            currentPrice: 1,
            originalPrice: 1,
            images: 1,
            viewCount: 1,
            interestedBuyers: 1,
            trendingScore: 1,
            vendor: {
              $arrayElemAt: [{
                $map: {
                  input: '$vendor',
                  as: 'v',
                  in: {
                    name: '$$v.name',
                    businessName: '$$v.businessName',
                    rating: '$$v.rating'
                  }
                }
              }, 0]
            }
          }
        }
      ]);

      if (redisClient) {
        await redisClient.setEx(cacheKey, 1800, JSON.stringify(trending));
      }

      return trending;
    } catch (error) {
      logger.error('Error fetching trending ingredients:', error);
      throw error;
    }
  }

  /**
   * Get ingredient categories
   */
  async getCategories() {
    try {
      const cacheKey = 'ingredient_categories';
      
      if (redisClient) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }

      const categories = await Ingredient.aggregate([
        {
          $match: {
            isAvailable: true,
            expiryDate: { $gt: new Date() }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            avgPrice: { $avg: '$currentPrice' },
            subcategories: { $addToSet: '$subcategory' }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            avgPrice: { $round: ['$avgPrice', 2] },
            subcategories: {
              $filter: {
                input: '$subcategories',
                cond: { $ne: ['$$this', null] }
              }
            }
          }
        }
      ]);

      if (redisClient) {
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(categories));
      }

      return categories;
    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Record ingredient inquiry
   */
  async recordInquiry(ingredientId: string, inquiringUserId: string) {
    try {
      await Ingredient.findByIdAndUpdate(
        ingredientId,
        { 
          $addToSet: { interestedBuyers: inquiringUserId }
        }
      );

      const ingredient = await Ingredient.findById(ingredientId).populate('vendorId', 'name fcmToken');
      if (ingredient && (ingredient as any).vendorId) {
        await notificationService.sendNotification({
          userId: (ingredient as any).vendorId._id.toString(),
          title: 'New Inquiry',
          message: `Someone is interested in your ${ingredient.name}`,
          type: 'system',
          data: {
            ingredientId,
            inquiringUserId
          }
        });
      }

      logger.info(`Inquiry recorded for ingredient: ${ingredientId} by user: ${inquiringUserId}`);
    } catch (error) {
      logger.error('Error recording inquiry:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getSearchResultsCount(query: IngredientSearchQuery): Promise<number> {
    const countQuery: any = {
      isAvailable: true,
      expiryDate: { $gt: new Date() }
    };

    if (query.category) countQuery.category = query.category;
    if (query.quality) countQuery.quality = query.quality;
    if (query.organic !== undefined) countQuery.organic = query.organic;
    if (query.priceRange) {
      countQuery.currentPrice = {
        $gte: query.priceRange.min,
        $lte: query.priceRange.max
      };
    }

    return await Ingredient.countDocuments(countQuery);
  }

  private async incrementViewCount(ingredientId: string, userId: string) {
    const key = `view:${ingredientId}:${userId}`;
    
    if (redisClient) {
      const viewed = await redisClient.get(key);
      
      if (!viewed) {
        await Promise.all([
          Ingredient.findByIdAndUpdate(ingredientId, { $inc: { viewCount: 1 } }),
          redisClient.setEx(key, 3600, '1')
        ]);
      }
    } else {
      await Ingredient.findByIdAndUpdate(ingredientId, { $inc: { viewCount: 1 } });
    }
  }

  private async incrementViewCounts(ingredientIds: string[], userId: string) {
    if (redisClient) {
      const pipeline = ingredientIds.map(id => [
        'setex',
        `view:${id}:${userId}`,
        3600,
        '1'
      ]);

      await (redisClient as any).multi(pipeline).exec();
    }
    
    await Ingredient.updateMany(
      { _id: { $in: ingredientIds } },
      { $inc: { viewCount: 1 } }
    );
  }

  private async cacheIngredient(ingredient: any) {
    if (redisClient) {
      const key = `ingredient:${ingredient._id}`;
      await redisClient.setEx(key, 3600, JSON.stringify(ingredient));
    }
  }

  private async removeCachedIngredient(ingredientId: string) {
    if (redisClient) {
      await redisClient.del(`ingredient:${ingredientId}`);
    }
  }

  private async schedulePriceUpdates(ingredientId: string) {
    const ingredient = await Ingredient.findById(ingredientId);
    if (!ingredient) return;

    const hoursToExpiry = (new Date((ingredient as any).expiryDate).getTime() - Date.now()) / (1000 * 60 * 60);
    
    const updateIntervals = [48, 24, 12, 6, 3, 1];
    
    if (redisClient) {
      for (const interval of updateIntervals) {
        if (hoursToExpiry > interval) {
          const scheduleTime = new Date((ingredient as any).expiryDate.getTime() - interval * 60 * 60 * 1000);
          await redisClient.zAdd(
            'price_update_schedule',
            { score: scheduleTime.getTime(), value: JSON.stringify({ ingredientId, interval }) }
          );
        }
      }
    }
  }

  private async notifyNearbyVendors(ingredient: any) {
    try {
      const vendor = await User.findById(ingredient.vendorId);
      if (!vendor || !(vendor as any).address?.coordinates) return;

      const nearbyVendors = await User.find({
        _id: { $ne: ingredient.vendorId },
        status: 'active',
        'address.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [
                (vendor as any).address.coordinates.longitude,
                (vendor as any).address.coordinates.latitude
              ]
            },
            $maxDistance: 10000
          }
        }
      }).limit(50);

      const notifications = nearbyVendors.map(nearbyVendor => 
        notificationService.sendNotification({
          userId: nearbyVendor._id.toString(),
          title: 'New Ingredient Available Nearby',
          message: `${ingredient.name} is available for ₹${ingredient.currentPrice}/${ingredient.unit}`,
          type: 'system',
          data: {
            ingredientId: ingredient._id.toString(),
            vendorName: (vendor as any).businessName || (vendor as any).name
          }
        })
      );

      await Promise.allSettled(notifications);
    } catch (error) {
      logger.error('Error notifying nearby vendors:', error);
    }
  }
}

export const ingredientService = new IngredientService();