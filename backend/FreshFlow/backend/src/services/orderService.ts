import mongoose from 'mongoose';
import { Order } from '../models/Order';
import { Ingredient } from '../models/Ingredient';
import { User } from '../models/User';
import { notificationService } from './notificationService';
import { logger } from '../utils/logger';
import { io } from '../config/socket';

interface CreateOrderData {
  buyerId: string;
  ingredientId: string;
  quantity: number;
  requestedPrice?: number;
  notes?: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    landmark?: string;
  };
}

interface UpdateOrderData {
  status?: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'disputed';
  trackingInfo?: string;
  notes?: string;
}

export class OrderService {
  // Create new order
  async createOrder(orderData: CreateOrderData) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { buyerId, ingredientId, quantity, requestedPrice, notes, deliveryAddress } = orderData;

      // Validate ingredient exists and has enough quantity
      const ingredient = await Ingredient.findById(ingredientId).session(session);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }

      if (ingredient.quantity < quantity) {
        throw new Error('Insufficient quantity available');
      }

      if (ingredient.vendorId.toString() === buyerId) {
        throw new Error('Cannot order your own ingredient');
      }

      // Calculate total price
      const finalPrice = requestedPrice || ingredient.currentPrice;
      const totalAmount = finalPrice * quantity;

      // Create order
      const order = new Order({
        buyerId,
        sellerId: ingredient.vendorId,
        ingredientId,
        quantity,
        pricePerUnit: finalPrice,
        totalAmount,
        status: 'pending',
        notes,
        deliveryAddress,
        orderDate: new Date()
      });

      await order.save({ session });

      // Reserve ingredient quantity
      ingredient.quantity -= quantity;
      ingredient.reservedQuantity = (ingredient.reservedQuantity || 0) + quantity;
      await ingredient.save({ session });

      await session.commitTransaction();

      // Populate order details
      const populatedOrder = await Order.findById(order._id)
        .populate('buyerId', 'name email phone businessName')
        .populate('sellerId', 'name email phone businessName')
        .populate('ingredientId', 'name category unit imageUrl');

      // Send notifications
      await notificationService.sendOrderNotification(
        ingredient.vendorId.toString(),
        'new_order',
        `New order received for ${ingredient.name}`,
        order._id.toString()
      );

      // Emit real-time update
      if (io) {
        io.to(`vendor_${ingredient.vendorId}`).emit('new_order', {
          order: populatedOrder,
          message: 'You have received a new order!'
        });
      }

      logger.info(`Order created: ${order._id} by buyer: ${buyerId}`);

      return populatedOrder;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error creating order:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get orders by user (buyer or seller)
  async getOrdersByUser(userId: string, role: 'buyer' | 'seller', filters: any = {}) {
    try {
      const {
        status,
        startDate,
        endDate,
        page = 1,
        limit = 10,
        sortBy = 'orderDate',
        sortOrder = 'desc'
      } = filters;

      const query: any = role === 'buyer' ? { buyerId: userId } : { sellerId: userId };

      if (status) {
        query.status = status;
      }

      if (startDate || endDate) {
        query.orderDate = {};
        if (startDate) query.orderDate.$gte = new Date(startDate);
        if (endDate) query.orderDate.$lte = new Date(endDate);
      }

      const sort: any = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        Order.find(query)
          .populate('buyerId', 'name email phone businessName')
          .populate('sellerId', 'name email phone businessName')
          .populate('ingredientId', 'name category unit imageUrl currentPrice')
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Order.countDocuments(query)
      ]);

      return {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalOrders: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching orders by user:', error);
      throw error;
    }
  }

  // Update order status
  async updateOrderStatus(orderId: string, updateData: UpdateOrderData, updatedBy: string) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId)
        .populate('ingredientId')
        .session(session);

      if (!order) {
        throw new Error('Order not found');
      }

      // Validate status transition
      const validTransitions = this.getValidStatusTransitions(order.status);
      if (updateData.status && !validTransitions.includes(updateData.status)) {
        throw new Error(`Invalid status transition from ${order.status} to ${updateData.status}`);
      }

      const oldStatus = order.status;

      // Update order
      Object.assign(order, updateData);
      order.timeline.push({
        status: updateData.status || order.status,
        timestamp: new Date(),
        updatedBy: new mongoose.Types.ObjectId(updatedBy)
      });

      await order.save({ session });

      // Handle quantity release for cancelled/rejected orders
      if ((updateData.status === 'cancelled' || updateData.status === 'disputed') && 
          ['pending', 'confirmed'].includes(oldStatus)) {
        const ingredient = await Ingredient.findById(order.ingredientId).session(session);
        if (ingredient && order.quantity) {
          ingredient.quantity += order.quantity;
          ingredient.reservedQuantity = Math.max(0, (ingredient.reservedQuantity || 0) - order.quantity);
          await ingredient.save({ session });
        }
      }

      // Handle quantity confirmation for completed orders
      if (updateData.status === 'completed' && oldStatus !== 'completed') {
        const ingredient = await Ingredient.findById(order.ingredientId).session(session);
        if (ingredient && order.quantity) {
          ingredient.reservedQuantity = Math.max(0, (ingredient.reservedQuantity || 0) - order.quantity);
          // Note: Add soldQuantity field to Ingredient model if you want to track this
          // ingredient.soldQuantity = (ingredient.soldQuantity || 0) + order.quantity;
          await ingredient.save({ session });
        }
      }

      await session.commitTransaction();

      // Send notifications
      const notificationMessage = this.getStatusNotificationMessage(updateData.status || order.status);
      const recipientId = updatedBy === order.sellerId.toString() ? 
        order.buyerId.toString() : order.sellerId.toString();

      await notificationService.sendOrderNotification(
        recipientId,
        'order_update',
        notificationMessage,
        order._id.toString()
      );

      // Emit real-time updates
      if (io) {
        io.to(`vendor_${order.sellerId}`).emit('order_updated', { orderId, status: order.status });
        io.to(`vendor_${order.buyerId}`).emit('order_updated', { orderId, status: order.status });
      }

      const updatedOrder = await Order.findById(orderId)
        .populate('buyerId', 'name email phone businessName')
        .populate('sellerId', 'name email phone businessName')
        .populate('ingredientId', 'name category unit imageUrl');

      logger.info(`Order ${orderId} status updated from ${oldStatus} to ${order.status}`);

      return updatedOrder;
    } catch (error) {
      await session.abortTransaction();
      logger.error('Error updating order status:', error);
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get order details
  async getOrderById(orderId: string, userId: string) {
    try {
      const order = await Order.findById(orderId)
        .populate('buyerId', 'name email phone businessName')
        .populate('sellerId', 'name email phone businessName')
        .populate('ingredientId', 'name category unit imageUrl currentPrice');

      if (!order) {
        throw new Error('Order not found');
      }

      // Check if user is authorized to view this order
      if (order.buyerId._id.toString() !== userId && order.sellerId._id.toString() !== userId) {
        throw new Error('Unauthorized to view this order');
      }

      return order;
    } catch (error) {
      logger.error('Error fetching order by ID:', error);
      throw error;
    }
  }

  // Get order analytics
  async getOrderAnalytics(userId: string, timeframe: string = '30d') {
    try {
      const days = parseInt(timeframe.replace('d', ''));
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [buyerStats, sellerStats] = await Promise.all([
        // Buyer statistics
        Order.aggregate([
          {
            $match: {
              buyerId: new mongoose.Types.ObjectId(userId),
              orderDate: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$totalAmount' },
              avgOrderValue: { $avg: '$totalAmount' },
              statusBreakdown: {
                $push: '$status'
              }
            }
          }
        ]),
        // Seller statistics
        Order.aggregate([
          {
            $match: {
              sellerId: new mongoose.Types.ObjectId(userId),
              orderDate: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' },
              avgOrderValue: { $avg: '$totalAmount' },
              statusBreakdown: {
                $push: '$status'
              }
            }
          }
        ])
      ]);

      return {
        buyer: buyerStats[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 },
        seller: sellerStats[0] || { totalOrders: 0, totalRevenue: 0, avgOrderValue: 0 }
      };
    } catch (error) {
      logger.error('Error fetching order analytics:', error);
      throw error;
    }
  }

  // Cancel order
  async cancelOrder(orderId: string, userId: string, reason: string) {
    try {
      const order = await Order.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if user can cancel this order
      if (order.buyerId.toString() !== userId && order.sellerId.toString() !== userId) {
        throw new Error('Unauthorized to cancel this order');
      }

      // Check if order can be cancelled
      if (!['pending', 'confirmed'].includes(order.status)) {
        throw new Error('Order cannot be cancelled at this stage');
      }

      return await this.updateOrderStatus(orderId, {
        status: 'cancelled',
        notes: `Cancelled: ${reason}`
      }, userId);
    } catch (error) {
      logger.error('Error cancelling order:', error);
      throw error;
    }
  }

  // Get valid status transitions
  private getValidStatusTransitions(currentStatus: string): string[] {
    const transitions: Record<string, string[]> = {
      'pending': ['confirmed', 'cancelled', 'disputed'],
      'confirmed': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['completed', 'cancelled'],
      'completed': [],
      'cancelled': [],
      'disputed': []
    };

    return transitions[currentStatus] || [];
  }

  // Get notification message for status
  private getStatusNotificationMessage(status: string): string {
    const messages: Record<string, string> = {
      'confirmed': 'Your order has been confirmed by the seller',
      'preparing': 'Your order is being prepared',
      'ready': 'Your order is ready for pickup/delivery',
      'completed': 'Your order has been completed',
      'cancelled': 'Your order has been cancelled',
      'disputed': 'Your order is under dispute'
    };

    return messages[status] || 'Your order status has been updated';
  }

  // Get orders requiring attention (for admin)
  async getOrdersRequiringAttention() {
    try {
      const orders = await Order.find({
        $or: [
          { status: 'pending', createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Pending for > 24 hours
          { status: 'disputed' }, // All disputed orders
          { status: 'preparing', updatedAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Preparing for > 7 days
        ]
      })
      .populate('buyerId', 'name email businessName')
      .populate('sellerId', 'name email businessName')
      .populate('ingredientId', 'name category')
      .sort({ createdAt: -1 });

      return orders;
    } catch (error) {
      logger.error('Error fetching orders requiring attention:', error);
      throw error;
    }
  }
}

export const orderService = new OrderService();