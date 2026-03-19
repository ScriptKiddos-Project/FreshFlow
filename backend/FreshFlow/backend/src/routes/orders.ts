import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { OrderController } from '../controllers/orderController';
import { body, param, query } from 'express-validator';

const router = Router();

// Validation schemas
const createOrderValidation = [
  body('sellerId').isMongoId().withMessage('Valid seller ID required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item required'),
  body('items.*.ingredientId').isMongoId().withMessage('Valid ingredient ID required'),
  body('items.*.quantity').isFloat({ min: 0.1 }).withMessage('Quantity must be positive'),
  body('items.*.pricePerUnit').isFloat({ min: 0.01 }).withMessage('Price must be positive'),
  body('deliveryAddress.street').isString().isLength({ min: 3 }).withMessage('Street address required'),
  body('deliveryAddress.city').isString().isLength({ min: 2 }).withMessage('City required'),
  body('deliveryAddress.pincode').isString().isLength({ min: 6, max: 6 }).withMessage('Valid pincode required'),
  body('deliveryAddress.state').isString().isLength({ min: 2 }).withMessage('State required'),
  body('paymentMethod').isIn(['cash', 'upi', 'card']).withMessage('Valid payment method required'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes too long')
];

const updateOrderStatusValidation = [
  param('orderId').isMongoId().withMessage('Valid order ID required'),
  body('status').isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
    .withMessage('Valid status required'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes too long')
];

const orderQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('status').optional().isIn(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  query('sellerId').optional().isMongoId().withMessage('Valid seller ID required'),
  query('buyerId').optional().isMongoId().withMessage('Valid buyer ID required')
];

// Create new order
router.post('/', 
  auth, 
  createOrderValidation, 
  OrderController.createOrder
);

// Get user's orders (both as buyer and seller)
router.get('/', 
  auth, 
  orderQueryValidation, 
  OrderController.getUserOrders
);

// Get specific order details
router.get('/:orderId', 
  auth, 
  param('orderId').isMongoId().withMessage('Valid order ID required'), 
  OrderController.getOrderById
);

// Update order status (seller only)
router.patch('/:orderId/status', 
  auth, 
  updateOrderStatusValidation, 
  OrderController.updateOrderStatus
);

// Cancel order (buyer or seller)
router.patch('/:orderId/cancel', 
  auth, 
  param('orderId').isMongoId().withMessage('Valid order ID required'),
  body('reason').isString().isLength({ min: 5, max: 500 }).withMessage('Cancellation reason required'),
  OrderController.cancelOrder
);

// Accept/Reject order (seller only)
router.patch('/:orderId/respond', 
  auth, 
  param('orderId').isMongoId().withMessage('Valid order ID required'),
  body('action').isIn(['accept', 'reject']).withMessage('Action must be accept or reject'),
  body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes too long'),
  OrderController.respondToOrder
);

// Get order analytics for seller
router.get('/analytics/seller', 
  auth, 
  query('period').optional().isIn(['today', 'week', 'month', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  OrderController.getSellerAnalytics
);

// Get order analytics for buyer
router.get('/analytics/buyer', 
  auth, 
  query('period').optional().isIn(['today', 'week', 'month', 'year']).withMessage('Invalid period'),
  query('startDate').optional().isISO8601().withMessage('Valid start date required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date required'),
  OrderController.getBuyerAnalytics
);

// Rate and review order (buyer only)
router.post('/:orderId/review', 
  auth, 
  param('orderId').isMongoId().withMessage('Valid order ID required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  body('review').optional().isString().isLength({ max: 1000 }).withMessage('Review too long'),
  OrderController.addOrderReview
);

// Get order history with filters
router.get('/history/detailed', 
  auth, 
  orderQueryValidation, 
  OrderController.getOrderHistory
);

export default router;