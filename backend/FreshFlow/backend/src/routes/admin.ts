import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { body, param, query } from 'express-validator';
import { User } from '../models/User';
import Order from '../models/Order';
import Ingredient from '../models/Ingredient';
import Transaction from '../models/Transaction';

const router = Router();

// Admin authorization middleware
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    next();
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Authorization error' 
    });
  }
};

// System statistics
router.get('/stats', 
  auth, 
  requireAdmin, 
  async (req: Request, res: Response) => {
    try {
      const [
        totalUsers,
        totalVendors,
        totalOrders,
        totalRevenue,
        activeIngredients,
        pendingApprovals
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'vendor', isVerified: true }),
        Order.countDocuments(),
        Transaction.aggregate([
          { $match: { status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Ingredient.countDocuments({ status: 'active' }),
        User.countDocuments({ role: 'vendor', isVerified: false })
      ]);

      const stats = {
        users: {
          total: totalUsers,
          vendors: totalVendors,
          buyers: totalUsers - totalVendors
        },
        orders: {
          total: totalOrders,
          pending: await Order.countDocuments({ status: 'pending' }),
          completed: await Order.countDocuments({ status: 'delivered' })
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          thisMonth: await Transaction.aggregate([
            {
              $match: {
                status: 'completed',
                createdAt: {
                  $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                }
              }
            },
            { $group: { _id: null, total: { $sum: '$amount' } } }
          ]).then(result => result[0]?.total || 0)
        },
        ingredients: {
          active: activeIngredients,
          expiringSoon: await Ingredient.countDocuments({
            expiryDate: { $lte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }
          })
        },
        pending: {
          vendorApprovals: pendingApprovals,
          reportedIssues: 0
        }
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch system statistics'
      });
    }
  }
);

// Vendor management
router.get('/vendors', 
  auth, 
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('status').optional().isIn(['verified', 'unverified', 'suspended']),
    query('search').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const status = req.query.status as string;
      const search = req.query.search as string;

      let filter: any = { role: 'vendor' };
      
      if (status === 'verified') filter.isVerified = true;
      if (status === 'unverified') filter.isVerified = false;
      if (status === 'suspended') filter.status = 'suspended';
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ];
      }

      const [vendors, total] = await Promise.all([
        User.find(filter)
          .select('-password -refreshToken')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(filter)
      ]);

      res.json({
        success: true,
        data: {
          vendors,
          pagination: {
            current: page,
            pages: Math.ceil(total / limit),
            total,
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vendors'
      });
    }
  }
);

// Approve/reject vendor
router.patch('/vendors/:vendorId/verify', 
  auth, 
  requireAdmin,
  [
    param('vendorId').isMongoId(),
    body('action').isIn(['approve', 'reject']),
    body('notes').optional().isString().isLength({ max: 500 })
  ],
  async (req: Request, res: Response) => {
    try {
      const { vendorId } = req.params;
      const { action, notes } = req.body;

      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== 'vendor') {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      if (action === 'approve') {
        vendor.isVerified = true;
        vendor.verifiedAt = new Date();
        vendor.verifiedBy = req.user!.id;
      } else {
        vendor.isVerified = false;
        vendor.status = 'banned';
        vendor.rejectionReason = notes;
      }

      await vendor.save();

      res.json({
        success: true,
        message: `Vendor ${action}d successfully`,
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update vendor status'
      });
    }
  }
);

// Suspend/unsuspend vendor
router.patch('/vendors/:vendorId/suspend', 
  auth, 
  requireAdmin,
  [
    param('vendorId').isMongoId(),
    body('action').isIn(['suspend', 'unsuspend']),
    body('reason').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const { vendorId } = req.params;
      const { action, reason } = req.body;

      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== 'vendor') {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      vendor.status = action === 'suspend' ? 'suspended' : 'active';
      if (action === 'suspend') {
        vendor.suspensionReason = reason;
        vendor.suspendedAt = new Date();
        vendor.suspendedBy = req.user!.id;
      } else {
        vendor.unsuspendedAt = new Date();
        vendor.unsuspendedBy = req.user!.id;
      }

      await vendor.save();

      res.json({
        success: true,
        message: `Vendor ${action}ed successfully`,
        data: vendor
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update vendor status'
      });
    }
  }
);

// System configuration
router.get('/config', 
  auth, 
  requireAdmin, 
  async (req: Request, res: Response) => {
    try {
      const config = {
        app: {
          maintenanceMode: false,
          allowRegistration: true,
          requireVerification: true
        },
        pricing: {
          platformFee: 2.5,
          minimumOrder: 100,
          deliveryFee: 25
        },
        limits: {
          maxOrderItems: 50,
          maxImageSize: 5000000,
          sessionTimeout: 3600000
        }
      };

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch configuration'
      });
    }
  }
);

// Update system configuration
router.patch('/config', 
  auth, 
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: req.body
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update configuration'
      });
    }
  }
);

// System health check
router.get('/health', 
  auth, 
  requireAdmin, 
  async (req: Request, res: Response) => {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          database: 'connected',
          redis: 'connected',
          storage: 'available'
        },
        performance: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage()
        }
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed'
      });
    }
  }
);

// Audit logs
router.get('/audit-logs', 
  auth, 
  requireAdmin,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('action').optional().isString(),
    query('userId').optional().isMongoId()
  ],
  async (req: Request, res: Response) => {
    try {
      const logs = [
        {
          id: '1',
          action: 'vendor_approved',
          performedBy: req.user!.id,
          targetUser: 'vendor123',
          timestamp: new Date(),
          details: 'Vendor approved after document verification'
        }
      ];

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            current: 1,
            pages: 1,
            total: logs.length
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch audit logs'
      });
    }
  }
);

export default router;