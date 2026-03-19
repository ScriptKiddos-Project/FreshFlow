import { Request, Response } from 'express';
import { Order } from '../models/Order';
import { Ingredient } from '../models/Ingredient';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { logger } from '../utils/logger';
import { validationResult } from 'express-validator';
import { notificationService } from '../services/notificationService';

interface AuthRequest extends Request {
  user?: any;
}

export class OrderController {
  /**
   * Create new order
   */
  static async createOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const {
        ingredientId,
        quantity,
        specialInstructions,
        deliveryAddress,
        paymentMethod = 'cash'
      } = req.body;

      const buyerId = req.user.id;

      // Get ingredient details
      const ingredient = await Ingredient.findById(ingredientId)
        .populate('vendorId', 'name businessName location phone');

      if (!ingredient || !ingredient.isActive) {
        res.status(404).json({
          success: false,
          message: 'Ingredient not found or not available'
        });
        return;
      }

      const requestedQuantity = parseFloat(quantity);

      // Validate quantity constraints - with null check
      const minOrder = ingredient.minOrderQuantity || ingredient.minimumOrderQuantity || 1;
      if (requestedQuantity < minOrder) {
        res.status(400).json({
          success: false,
          message: `Minimum order quantity is ${minOrder} ${ingredient.unit}`
        });
        return;
      }

      if (ingredient.maxOrderQuantity && requestedQuantity > ingredient.maxOrderQuantity) {
        res.status(400).json({
          success: false,
          message: `Maximum order quantity is ${ingredient.maxOrderQuantity} ${ingredient.unit}`
        });
        return;
      }

      // Check availability
      if (requestedQuantity > ingredient.quantity) {
        res.status(400).json({
          success: false,
          message: `Only ${ingredient.quantity} ${ingredient.unit} available`
        });
        return;
      }

      // Prevent self-ordering
      if (buyerId === ingredient.vendorId._id.toString()) {
        res.status(400).json({
          success: false,
          message: 'Cannot order from yourself'
        });
        return;
      }

      // Calculate pricing
      const unitPrice = ingredient.currentPrice;
      const subtotal = Math.round(unitPrice * requestedQuantity * 100) / 100;
      const platformFee = Math.round(subtotal * 0.03 * 100) / 100; // 3% platform fee
      const totalAmount = Math.round((subtotal + platformFee) * 100) / 100;

      // Generate order ID
      const orderNumber = `FF${Date.now()}${Math.floor(Math.random() * 1000)}`;

      // Create order
      const order = new Order({
        orderNumber,
        orderId: orderNumber,
        buyerId,
        sellerId: ingredient.vendorId._id,
        ingredientId,
        quantity: requestedQuantity,
        unitPrice,
        subtotal,
        platformFee,
        totalAmount,
        finalAmount: totalAmount,
        specialInstructions: specialInstructions?.trim(),
        deliveryDetails: {
          type: 'delivery',
          address: deliveryAddress,
          instructions: specialInstructions
        },
        paymentMethod,
        status: 'pending',
        timeline: [{
          status: 'pending',
          timestamp: new Date(),
          note: 'Order placed'
        }]
      });

      await order.save();

      // Populate order details
      await order.populate([
        { path: 'buyerId', select: 'name businessName phone' },
        { path: 'sellerId', select: 'name businessName phone location' },
        { path: 'ingredientId', select: 'name category unit images' }
      ]);

      // Send notification to seller
      await notificationService.sendOrderNotification(
        ingredient.vendorId._id.toString(),
        'new_order',
        `New order received for ${ingredient.name}`,
        order._id.toString()
      );

      logger.info(`Order created: ${orderNumber} by buyer ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order }
      });

    } catch (error) {
      logger.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get all orders for user (buyer or seller)
   */
  static async getUserOrders(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const {
        page = 1,
        limit = 20,
        type = 'all', // all, buying, selling
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      // Build query
      let query: any = {};

      if (type === 'buying') {
        query.buyerId = userId;
      } else if (type === 'selling') {
        query.sellerId = userId;
      } else {
        query.$or = [
          { buyerId: userId },
          { sellerId: userId }
        ];
      }

      if (status) {
        query.status = status;
      }

      // Sorting
      const sortDirection = sortOrder === 'desc' ? -1 : 1;
      const sortOptions: any = {};
      sortOptions[sortBy as string] = sortDirection;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('buyerId', 'name businessName phone')
          .populate('sellerId', 'name businessName phone location')
          .populate('ingredientId', 'name category unit images')
          .sort(sortOptions)
          .skip(skip)
          .limit(limitNum),
        Order.countDocuments(query)
      ]);

      // Add role information for each order
      const ordersWithRole = orders.map(order => ({
        ...order.toObject(),
        userRole: order.buyerId._id.toString() === userId ? 'buyer' : 'seller'
      }));

      res.json({
        success: true,
        data: {
          orders: ordersWithRole,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalOrders: total,
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get user orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findById(orderId)
        .populate('buyerId', 'name businessName phone email')
        .populate('sellerId', 'name businessName phone email location')
        .populate('ingredientId', 'name category unit images description');

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      // Check if user is involved in this order
      if (order.buyerId._id.toString() !== userId && order.sellerId._id.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      const userRole = order.buyerId._id.toString() === userId ? 'buyer' : 'seller';

      res.json({
        success: true,
        data: {
          order: {
            ...order.toObject(),
            userRole
          }
        }
      });

    } catch (error) {
      logger.error('Get order by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Update order status (seller only)
   */
  static async updateOrderStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: errors.array()
        });
        return;
      }

      const { orderId } = req.params;
      const { status, note } = req.body;
      const userId = req.user.id;

      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      // Only seller can update order status
      if (order.sellerId.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Only seller can update order status'
        });
        return;
      }

      // Validate status transition
      const validTransitions: { [key: string]: string[] } = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['preparing', 'cancelled'],
        'preparing': ['ready', 'cancelled'],
        'ready': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': [],
        'disputed': []
      };

      if (!validTransitions[order.status].includes(status)) {
        res.status(400).json({
          success: false,
          message: `Cannot transition from ${order.status} to ${status}`
        });
        return;
      }

      const oldStatus = order.status;
      order.status = status;
      order.updatedAt = new Date();

      // Add to timeline
      order.timeline.push({
        status,
        timestamp: new Date(),
        note: note?.trim() || `Order status changed to ${status}`
      });

      // Handle specific status changes
      if (status === 'confirmed') {
        // Reserve the ingredient quantity
        const ingredient = await Ingredient.findById(order.ingredientId);
        if (ingredient) {
          const orderQty = order.quantity || 0;
          if (ingredient.quantity < orderQty) {
            res.status(400).json({
              success: false,
              message: 'Insufficient quantity available'
            });
            return;
          }
          
          ingredient.quantity -= orderQty;
          if (ingredient.quantity <= 0) {
            ingredient.isActive = false;
          }
          await ingredient.save();
        }
      } else if (status === 'cancelled') {
        // Restore ingredient quantity if it was previously confirmed
        if (oldStatus === 'confirmed' || oldStatus === 'preparing') {
          const ingredient = await Ingredient.findById(order.ingredientId);
          if (ingredient) {
            ingredient.quantity += (order.quantity || 0);
            ingredient.isActive = true;
            await ingredient.save();
          }
        }
      } else if (status === 'completed') {
        // Create transaction record
        const transaction = new Transaction({
          orderId: order._id,
          buyerId: order.buyerId,
          sellerId: order.sellerId,
          amount: order.totalAmount,
          platformFee: order.platformFee,
          type: 'order_payment',
          status: 'completed',
          paymentMethod: order.paymentMethod
        });
        await transaction.save();
      }

      await order.save();

      // Send notification to buyer
      await notificationService.sendOrderNotification(
        order.buyerId.toString(),
        'order_update',
        `Your order status has been updated to ${status}`,
        order._id.toString()
      );

      // Populate order details for response
      await order.populate([
        { path: 'buyerId', select: 'name businessName phone' },
        { path: 'sellerId', select: 'name businessName phone' },
        { path: 'ingredientId', select: 'name category unit' }
      ]);

      logger.info(`Order status updated: ${order.orderNumber} to ${status} by seller ${req.user.email}`);

      res.json({
        success: true,
        message: 'Order status updated successfully',
        data: { order }
      });

    } catch (error) {
      logger.error('Update order status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Cancel order (buyer only, within certain conditions)
   */
  static async cancelOrder(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      const order = await Order.findById(orderId);
      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      // Only buyer can cancel order
      if (order.buyerId.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Only buyer can cancel order'
        });
        return;
      }

      // Check if order can be cancelled
      if (!['pending', 'confirmed'].includes(order.status)) {
        res.status(400).json({
          success: false,
          message: 'Order cannot be cancelled at this stage'
        });
        return;
      }

      const oldStatus = order.status;
      order.status = 'cancelled';
      order.cancellationReason = reason?.trim();
      order.updatedAt = new Date();

      // Add to timeline
      order.timeline.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: `Order cancelled by buyer. Reason: ${reason || 'No reason provided'}`
      });

      // Restore ingredient quantity if it was confirmed
      if (oldStatus === 'confirmed') {
        const ingredient = await Ingredient.findById(order.ingredientId);
        if (ingredient) {
          ingredient.quantity += (order.quantity || 0);
          ingredient.isActive = true;
          await ingredient.save();
        }
      }

      await order.save();

      // Send notification to seller
      await notificationService.sendOrderNotification(
        order.sellerId.toString(),
        'order_cancelled',
        `Order ${order.orderNumber} has been cancelled by buyer`,
        order._id.toString()
      );

      logger.info(`Order cancelled: ${order.orderNumber} by buyer ${req.user.email}`);

      res.json({
        success: true,
        message: 'Order cancelled successfully'
      });

    } catch (error) {
      logger.error('Cancel order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { period = '30' } = req.query; // days

      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get order statistics
      const [
        totalOrders,
        buyingOrders,
        sellingOrders,
        completedOrders,
        pendingOrders,
        totalSales,
        totalPurchases,
        recentActivity
      ] = await Promise.all([
        Order.countDocuments({
          $or: [{ buyerId: userId }, { sellerId: userId }],
          createdAt: { $gte: startDate }
        }),
        Order.countDocuments({
          buyerId: userId,
          createdAt: { $gte: startDate }
        }),
        Order.countDocuments({
          sellerId: userId,
          createdAt: { $gte: startDate }
        }),
        Order.countDocuments({
          $or: [{ buyerId: userId }, { sellerId: userId }],
          status: 'completed',
          createdAt: { $gte: startDate }
        }),
        Order.countDocuments({
          $or: [{ buyerId: userId }, { sellerId: userId }],
          status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }
        }),
        Order.aggregate([
          {
            $match: {
              sellerId: userId,
              status: 'completed',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' },
              count: { $sum: 1 }
            }
          }
        ]),
        Order.aggregate([
          {
            $match: {
              buyerId: userId,
              status: 'completed',
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$totalAmount' },
              count: { $sum: 1 }
            }
          }
        ]),
        Order.find({
          $or: [{ buyerId: userId }, { sellerId: userId }]
        })
          .populate('ingredientId', 'name category')
          .sort({ createdAt: -1 })
          .limit(5)
          .select('orderNumber status totalAmount createdAt')
      ]);

      const stats = {
        period: days,
        orders: {
          total: totalOrders,
          buying: buyingOrders,
          selling: sellingOrders,
          completed: completedOrders,
          pending: pendingOrders,
          completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0
        },
        financial: {
          totalSalesAmount: totalSales[0]?.total || 0,
          totalSalesCount: totalSales[0]?.count || 0,
          totalPurchasesAmount: totalPurchases[0]?.total || 0,
          totalPurchasesCount: totalPurchases[0]?.count || 0,
          averageSaleValue: totalSales[0]?.count > 0 ? (totalSales[0].total / totalSales[0].count) : 0,
          averagePurchaseValue: totalPurchases[0]?.count > 0 ? (totalPurchases[0].total / totalPurchases[0].count) : 0
        },
        recentActivity
      };

      res.json({
        success: true,
        data: { stats }
      });

    } catch (error) {
      logger.error('Get order stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get daily order trends
   */
  static async getOrderTrends(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user.id;
      const { days = 30 } = req.query;

      const daysNum = parseInt(days as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      startDate.setHours(0, 0, 0, 0);

      const trends = await Order.aggregate([
        {
          $match: {
            $or: [{ buyerId: userId }, { sellerId: userId }],
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              type: {
                $cond: [
                  { $eq: ['$sellerId', userId] },
                  'selling',
                  'buying'
                ]
              }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            buying: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'buying'] },
                  '$count',
                  0
                ]
              }
            },
            selling: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'selling'] },
                  '$count',
                  0
                ]
              }
            },
            buyingAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'buying'] },
                  '$totalAmount',
                  0
                ]
              }
            },
            sellingAmount: {
              $sum: {
                $cond: [
                  { $eq: ['$_id.type', 'selling'] },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      res.json({
        success: true,
        data: {
          trends,
          period: daysNum
        }
      });

    } catch (error) {
      logger.error('Get order trends error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get orders by status (admin only)
   */
  static async getOrdersByStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      let query: any = {};

      if (status) {
        query.status = status;
      }

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate as string);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate as string);
        }
      }

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('buyerId', 'name businessName email phone')
          .populate('sellerId', 'name businessName email phone')
          .populate('ingredientId', 'name category')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum),
        Order.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          orders,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalOrders: total,
            hasNextPage: pageNum < Math.ceil(total / limitNum),
            hasPrevPage: pageNum > 1
          }
        }
      });

    } catch (error) {
      logger.error('Get orders by status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get order disputes (admin only)
   */
  static async getOrderDisputes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const disputes = await Order.find({
        status: 'cancelled',
        cancellationReason: { $exists: true, $ne: '' }
      })
        .populate('buyerId', 'name businessName email phone')
        .populate('sellerId', 'name businessName email phone')
        .populate('ingredientId', 'name category')
        .sort({ updatedAt: -1 })
        .limit(50);

      res.json({
        success: true,
        data: { disputes }
      });

    } catch (error) {
      logger.error('Get order disputes error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Generate order invoice
   */
  static async generateInvoice(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const order = await Order.findById(orderId)
        .populate('buyerId', 'name businessName email phone address')
        .populate('sellerId', 'name businessName email phone address')
        .populate('ingredientId', 'name category unit description');

      if (!order) {
        res.status(404).json({
          success: false,
          message: 'Order not found'
        });
        return;
      }

      // Check if user is involved in this order
      if (order.buyerId._id.toString() !== userId && order.sellerId._id.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      // Only generate invoice for completed orders
      if (order.status !== 'completed') {
        res.status(400).json({
          success: false,
          message: 'Invoice can only be generated for completed orders'
        });
        return;
      }

      const ingredient = order.ingredientId as any;

      const invoice = {
        orderNumber: order.orderNumber || order.orderId,
        invoiceNumber: `INV-${order.orderNumber || order.orderId}`,
        date: order.updatedAt,
        buyer: order.buyerId,
        seller: order.sellerId,
        items: [{
          name: ingredient?.name || 'N/A',
          category: ingredient?.category || 'N/A',
          unit: ingredient?.unit || 'N/A',
          quantity: order.quantity,
          unitPrice: order.unitPrice,
          total: order.subtotal
        }],
        subtotal: order.subtotal,
        platformFee: order.platformFee,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        timeline: order.timeline
      };

      res.json({
        success: true,
        data: { invoice }
      });

    } catch (error) {
      logger.error('Generate invoice error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Bulk update order status (admin only)
   */
  static async bulkUpdateStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
        return;
      }

      const { orderIds, status, note } = req.body;

      if (!Array.isArray(orderIds) || orderIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Order IDs array is required'
        });
        return;
      }

      const bulkOps = orderIds.map((orderId: string) => ({
        updateOne: {
          filter: { _id: orderId },
          update: {
            $set: {
              status,
              updatedAt: new Date()
            },
            $push: {
              timeline: {
                status,
                timestamp: new Date(),
                note: note || `Bulk update by admin to ${status}`
              }
            }
          }
        }
      }));

      const result = await Order.bulkWrite(bulkOps);

      logger.info(`Bulk order status update by admin ${req.user.email}: ${result.modifiedCount} orders updated to ${status}`);

      res.json({
        success: true,
        message: 'Bulk status update completed',
        data: {
          updatedCount: result.modifiedCount,
          status
        }
      });

    } catch (error) {
      logger.error('Bulk update status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add these methods to your OrderController class

/**
 * Respond to order (seller only - accept/reject)
 */
static async respondToOrder(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
      return;
    }

    const { orderId } = req.params;
    const { action, notes } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    // Only seller can respond to order
    if (order.sellerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Only seller can respond to order'
      });
      return;
    }

    // Can only respond to pending orders
    if (order.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: 'Can only respond to pending orders'
      });
      return;
    }

    if (action === 'accept') {
      order.status = 'confirmed';
      order.timeline.push({
        status: 'confirmed',
        timestamp: new Date(),
        note: notes || 'Order accepted by seller'
      });

      // Reserve ingredient quantity
      const ingredient = await Ingredient.findById(order.ingredientId);
      if (ingredient) {
        const orderQty = order.quantity || 0;
        if (ingredient.quantity < orderQty) {
          res.status(400).json({
            success: false,
            message: 'Insufficient quantity available'
          });
          return;
        }
        
        ingredient.quantity -= orderQty;
        if (ingredient.quantity <= 0) {
          ingredient.isActive = false;
        }
        await ingredient.save();
      }

      // Notify buyer
      await notificationService.sendOrderNotification(
        order.buyerId.toString(),
        'order_accepted',
        `Your order ${order.orderNumber} has been accepted`,
        order._id.toString()
      );

    } else if (action === 'reject') {
      order.status = 'cancelled';
      order.cancellationReason = notes || 'Rejected by seller';
      order.timeline.push({
        status: 'cancelled',
        timestamp: new Date(),
        note: notes || 'Order rejected by seller'
      });

      // Notify buyer
      await notificationService.sendOrderNotification(
        order.buyerId.toString(),
        'order_rejected',
        `Your order ${order.orderNumber} has been rejected`,
        order._id.toString()
      );
    }

    order.updatedAt = new Date();
    await order.save();

    // Populate order details
    await order.populate([
      { path: 'buyerId', select: 'name businessName phone' },
      { path: 'sellerId', select: 'name businessName phone' },
      { path: 'ingredientId', select: 'name category unit' }
    ]);

    logger.info(`Order ${action}ed: ${order.orderNumber} by seller ${req.user.email}`);

    res.json({
      success: true,
      message: `Order ${action}ed successfully`,
      data: { order }
    });

  } catch (error) {
    logger.error('Respond to order error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get seller analytics
 */
static async getSellerAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user.id;
    const { period = 'month', startDate, endDate } = req.query;

    let dateFilter: any = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };
    } else {
      switch (period) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dateFilter.createdAt = { $gte: today };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: monthAgo };
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: yearAgo };
          break;
      }
    }

    const baseQuery = { sellerId: userId, ...dateFilter };

    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      revenue,
      topProducts,
      recentOrders
    ] = await Promise.all([
      Order.countDocuments(baseQuery),
      Order.countDocuments({ ...baseQuery, status: 'completed' }),
      Order.countDocuments({ ...baseQuery, status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } }),
      Order.countDocuments({ ...baseQuery, status: 'cancelled' }),
      Order.aggregate([
        { $match: { ...baseQuery, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalAmount' },
            totalPlatformFees: { $sum: '$platformFee' },
            netRevenue: { $sum: { $subtract: ['$totalAmount', '$platformFee'] } },
            averageOrderValue: { $avg: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $match: { ...baseQuery, status: 'completed' } },
        {
          $group: {
            _id: '$ingredientId',
            totalQuantity: { $sum: '$quantity' },
            totalRevenue: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'ingredients',
            localField: '_id',
            foreignField: '_id',
            as: 'ingredient'
          }
        },
        { $unwind: '$ingredient' }
      ]),
      Order.find(baseQuery)
        .populate('buyerId', 'name businessName')
        .populate('ingredientId', 'name category')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber status totalAmount createdAt')
    ]);

    const analytics = {
      period,
      overview: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0,
        cancellationRate: totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(2) : 0
      },
      revenue: revenue[0] || {
        totalRevenue: 0,
        totalPlatformFees: 0,
        netRevenue: 0,
        averageOrderValue: 0,
        orderCount: 0
      },
      topProducts: topProducts.map(p => ({
        ingredientId: p._id,
        name: p.ingredient.name,
        category: p.ingredient.category,
        totalQuantity: p.totalQuantity,
        totalRevenue: p.totalRevenue,
        orderCount: p.orderCount
      })),
      recentOrders
    };

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Get seller analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get buyer analytics
 */
static async getBuyerAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user.id;
    const { period = 'month', startDate, endDate } = req.query;

    let dateFilter: any = {};
    const now = new Date();

    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };
    } else {
      switch (period) {
        case 'today':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          dateFilter.createdAt = { $gte: today };
          break;
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: weekAgo };
          break;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: monthAgo };
          break;
        case 'year':
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          dateFilter.createdAt = { $gte: yearAgo };
          break;
      }
    }

    const baseQuery = { buyerId: userId, ...dateFilter };

    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      spending,
      topCategories,
      topSellers,
      recentOrders
    ] = await Promise.all([
      Order.countDocuments(baseQuery),
      Order.countDocuments({ ...baseQuery, status: 'completed' }),
      Order.countDocuments({ ...baseQuery, status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] } }),
      Order.countDocuments({ ...baseQuery, status: 'cancelled' }),
      Order.aggregate([
        { $match: { ...baseQuery, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalSpent: { $sum: '$totalAmount' },
            averageOrderValue: { $avg: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        }
      ]),
      Order.aggregate([
        { $match: { ...baseQuery, status: 'completed' } },
        {
          $lookup: {
            from: 'ingredients',
            localField: 'ingredientId',
            foreignField: '_id',
            as: 'ingredient'
          }
        },
        { $unwind: '$ingredient' },
        {
          $group: {
            _id: '$ingredient.category',
            totalSpent: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 }
      ]),
      Order.aggregate([
        { $match: { ...baseQuery, status: 'completed' } },
        {
          $group: {
            _id: '$sellerId',
            totalSpent: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'seller'
          }
        },
        { $unwind: '$seller' }
      ]),
      Order.find(baseQuery)
        .populate('sellerId', 'name businessName')
        .populate('ingredientId', 'name category')
        .sort({ createdAt: -1 })
        .limit(10)
        .select('orderNumber status totalAmount createdAt')
    ]);

    const analytics = {
      period,
      overview: {
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        completionRate: totalOrders > 0 ? ((completedOrders / totalOrders) * 100).toFixed(2) : 0
      },
      spending: spending[0] || {
        totalSpent: 0,
        averageOrderValue: 0,
        orderCount: 0
      },
      topCategories: topCategories.map(c => ({
        category: c._id,
        totalSpent: c.totalSpent,
        orderCount: c.orderCount
      })),
      topSellers: topSellers.map(s => ({
        sellerId: s._id,
        name: s.seller.businessName || s.seller.name,
        totalSpent: s.totalSpent,
        orderCount: s.orderCount
      })),
      recentOrders
    };

    res.json({
      success: true,
      data: { analytics }
    });

  } catch (error) {
    logger.error('Get buyer analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Add order review (buyer only)
 */
/**
 * Add order review (buyer only)
 */
static async addOrderReview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errors.array()
      });
      return;
    }

    const { orderId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    const order = await Order.findById(orderId);
    if (!order) {
      res.status(404).json({
        success: false,
        message: 'Order not found'
      });
      return;
    }

    // Only buyer can review order
    if (order.buyerId.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: 'Only buyer can review order'
      });
      return;
    }

    // Can only review completed orders
    if (order.status !== 'completed') {
      res.status(400).json({
        success: false,
        message: 'Can only review completed orders'
      });
      return;
    }

    // Check if already reviewed
    if (order.rating?.buyerRating) {
      res.status(400).json({
        success: false,
        message: 'Order already reviewed'
      });
      return;
    }

    // Add review to order
    if (!order.rating) {
      order.rating = {};
    }
    order.rating.buyerRating = rating;
    order.rating.buyerReview = review?.trim();

    order.updatedAt = new Date();
    await order.save();

    // Update seller's average rating
    const sellerOrders = await Order.find({
      sellerId: order.sellerId,
      'rating.buyerRating': { $exists: true }
    });

    const totalRating = sellerOrders.reduce((sum, o) => sum + (o.rating?.buyerRating || 0), 0);
    const avgRating = totalRating / sellerOrders.length;

    await User.findByIdAndUpdate(order.sellerId, {
      'sellerStats.averageRating': Math.round(avgRating * 10) / 10,
      'sellerStats.totalReviews': sellerOrders.length
    });

    // Notify seller
    await notificationService.sendOrderNotification(
      order.sellerId.toString(),
      'new_review',
      `You received a ${rating}-star review`,
      order._id.toString()
    );

    logger.info(`Order reviewed: ${order.orderNumber || order.orderId} by buyer ${req.user.email}`);

    res.json({
      success: true,
      message: 'Review added successfully',
      data: {
        rating: order.rating
      }
    });

  } catch (error) {
    logger.error('Add order review error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get order history with detailed filters
 */
static async getOrderHistory(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      sellerId,
      buyerId,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query: any = {
      $or: [
        { buyerId: userId },
        { sellerId: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate as string);
      }
    }

    if (sellerId) {
      query.sellerId = sellerId;
    }

    if (buyerId) {
      query.buyerId = buyerId;
    }

    // Sorting
    const sortDirection = sortOrder === 'desc' ? -1 : 1;
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortDirection;

    const [orders, total, statusCounts] = await Promise.all([
      Order.find(query)
        .populate('buyerId', 'name businessName phone email')
        .populate('sellerId', 'name businessName phone email location')
        .populate('ingredientId', 'name category unit images description')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum),
      Order.countDocuments(query),
      Order.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Add role information for each order
    const ordersWithRole = orders.map(order => ({
      ...order.toObject(),
      userRole: order.buyerId._id.toString() === userId ? 'buyer' : 'seller'
    }));

    // Format status counts
    const statusSummary: any = {};
    statusCounts.forEach(s => {
      statusSummary[s._id] = s.count;
    });

    res.json({
      success: true,
      data: {
        orders: ordersWithRole,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalOrders: total,
          hasNextPage: pageNum < Math.ceil(total / limitNum),
          hasPrevPage: pageNum > 1
        },
        statusSummary,
        filters: {
          status,
          startDate,
          endDate,
          sortBy,
          sortOrder
        }
      }
    });

  } catch (error) {
    logger.error('Get order history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}
}