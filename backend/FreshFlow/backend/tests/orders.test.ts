import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Ingredient } from '../src/models/Ingredient';
import { Order } from '../src/models/Order';
import { connectDB, disconnectDB } from '../src/config/database';

describe('Orders Tests', () => {
  let buyerToken: string;
  let buyerId: string;
  let sellerToken: string;
  let sellerId: string;
  let ingredientId: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Ingredient.deleteMany({});
    await Order.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Ingredient.deleteMany({});
    await Order.deleteMany({});

    // Create buyer
    const buyerData = {
      name: 'Test Buyer',
      email: 'buyer@example.com',
      password: 'Test123!@#',
      phone: '9876543210',
      role: 'vendor',
      location: {
        address: 'Buyer Street, Mumbai',
        coordinates: [72.8777, 19.0760],
        pincode: '400001'
      }
    };

    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send(buyerData);

    buyerToken = buyerResponse.body.data.token;
    buyerId = buyerResponse.body.data.user._id;

    // Create seller
    const sellerData = {
      name: 'Test Seller',
      email: 'seller@example.com',
      password: 'Test123!@#',
      phone: '9876543211',
      role: 'vendor',
      location: {
        address: 'Seller Street, Mumbai',
        coordinates: [72.8777, 19.0760],
        pincode: '400002'
      }
    };

    const sellerResponse = await request(app)
      .post('/api/auth/register')
      .send(sellerData);

    sellerToken = sellerResponse.body.data.token;
    sellerId = sellerResponse.body.data.user._id;

    // Create ingredient
    const ingredient = new Ingredient({
      name: 'Fresh Tomatoes',
      category: 'vegetables',
      quantity: 10,
      unit: 'kg',
      basePrice: 50,
      currentPrice: 50,
      vendorId: sellerId,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      location: { coordinates: [72.8777, 19.0760] }
    });

    const savedIngredient = await ingredient.save();
    ingredientId = savedIngredient._id.toString();
  });

  describe('POST /api/orders', () => {
    const validOrderData = {
      sellerId,
      items: [{
        ingredientId: '',
        quantity: 5,
        pricePerUnit: 50
      }],
      deliveryAddress: {
        address: 'Delivery Street, Mumbai',
        coordinates: [72.8777, 19.0760],
        pincode: '400003'
      }
    };

    beforeEach(() => {
      validOrderData.items[0].ingredientId = ingredientId;
    });

    it('should create order successfully', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validOrderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order).toHaveProperty('_id');
      expect(response.body.data.order.buyerId).toBe(buyerId);
      expect(response.body.data.order.sellerId).toBe(sellerId);
      expect(response.body.data.order.status).toBe('pending');
      expect(response.body.data.order.totalAmount).toBe(250); // 5 * 50
    });

    it('should not create order without authentication', async () => {
      const response = await request(app)
        .post('/api/orders')
        .send(validOrderData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not create order with insufficient ingredient quantity', async () => {
      const invalidOrderData = {
        ...validOrderData,
        items: [{
          ingredientId,
          quantity: 15, // More than available (10)
          pricePerUnit: 50
        }]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(invalidOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('insufficient quantity');
    });

    it('should not create order for own ingredients', async () => {
      const selfOrderData = {
        ...validOrderData,
        sellerId: buyerId
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(selfOrderData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('cannot order from yourself');
    });

    it('should calculate total amount correctly with multiple items', async () => {
      // Create another ingredient
      const ingredient2 = new Ingredient({
        name: 'Fresh Onions',
        category: 'vegetables',
        quantity: 8,
        unit: 'kg',
        basePrice: 30,
        currentPrice: 30,
        vendorId: sellerId,
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        location: { coordinates: [72.8777, 19.0760] }
      });

      const savedIngredient2 = await ingredient2.save();

      const multiItemOrderData = {
        ...validOrderData,
        items: [
          {
            ingredientId,
            quantity: 5,
            pricePerUnit: 50
          },
          {
            ingredientId: savedIngredient2._id.toString(),
            quantity: 3,
            pricePerUnit: 30
          }
        ]
      };

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(multiItemOrderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.totalAmount).toBe(340); // (5*50) + (3*30)
      expect(response.body.data.order.items).toHaveLength(2);
    });
  });

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      // Create test orders
      const orders = [
        {
          buyerId,
          sellerId,
          items: [{
            ingredientId,
            ingredientName: 'Fresh Tomatoes',
            quantity: 5,
            pricePerUnit: 50
          }],
          totalAmount: 250,
          status: 'pending'
        },
        {
          buyerId,
          sellerId,
          items: [{
            ingredientId,
            ingredientName: 'Fresh Tomatoes',
            quantity: 3,
            pricePerUnit: 50
          }],
          totalAmount: 150,
          status: 'completed'
        }
      ];

      await Order.insertMany(orders);
    });

    it('should get orders for buyer', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      response.body.data.orders.forEach((order: any) => {
        expect(order.buyerId).toBe(buyerId);
      });
    });

    it('should get orders for seller', async () => {
      const response = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(2);
      response.body.data.orders.forEach((order: any) => {
        expect(order.sellerId).toBe(sellerId);
      });
    });

    it('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/orders?status=completed')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.orders).toHaveLength(1);
      expect(response.body.data.orders[0].status).toBe('completed');
    });

    it('should not get orders without authentication', async () => {
      const response = await request(app)
        .get('/api/orders')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/orders/:id', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = new Order({
        buyerId,
        sellerId,
        items: [{
          ingredientId,
          ingredientName: 'Fresh Tomatoes',
          quantity: 5,
          pricePerUnit: 50
        }],
        totalAmount: 250,
        status: 'pending'
      });

      const savedOrder = await order.save();
      orderId = savedOrder._id.toString();
    });

    it('should get order by id for buyer', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order._id).toBe(orderId);
      expect(response.body.data.order.buyerId).toBe(buyerId);
    });

    it('should get order by id for seller', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order._id).toBe(orderId);
      expect(response.body.data.order.sellerId).toBe(sellerId);
    });

    it('should not get order for unauthorized user', async () => {
      // Create another user
      const otherUserData = {
        name: 'Other User',
        email: 'other@example.com',
        password: 'Test123!@#',
        phone: '9876543212',
        role: 'vendor'
      };

      const otherUserResponse = await request(app)
        .post('/api/auth/register')
        .send(otherUserData);

      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${otherUserResponse.body.data.token}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });
  });

  describe('PUT /api/orders/:id/status', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = new Order({
        buyerId,
        sellerId,
        items: [{
          ingredientId,
          ingredientName: 'Fresh Tomatoes',
          quantity: 5,
          pricePerUnit: 50
        }],
        totalAmount: 250,
        status: 'pending'
      });

      const savedOrder = await order.save();
      orderId = savedOrder._id.toString();
    });

    it('should accept order by seller', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'accepted' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('accepted');
    });

    it('should reject order by seller', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'rejected', rejectionReason: 'Out of stock' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('rejected');
      expect(response.body.data.order.rejectionReason).toBe('Out of stock');
    });

    it('should complete order by seller', async () => {
      // First accept the order
      await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'accepted' });

      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('completed');
      expect(response.body.data.order.completedAt).toBeDefined();
    });

    it('should cancel order by buyer', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.status).toBe('cancelled');
    });

    it('should not update order status with invalid status', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should not allow buyer to accept/reject orders', async () => {
      const response = await request(app)
        .put(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'accepted' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });
  });

  describe('POST /api/orders/:id/rating', () => {
    let orderId: string;

    beforeEach(async () => {
      const order = new Order({
        buyerId,
        sellerId,
        items: [{
          ingredientId,
          ingredientName: 'Fresh Tomatoes',
          quantity: 5,
          pricePerUnit: 50
        }],
        totalAmount: 250,
        status: 'completed',
        completedAt: new Date()
      });

      const savedOrder = await order.save();
      orderId = savedOrder._id.toString();
    });

    it('should add rating to completed order by buyer', async () => {
      const ratingData = {
        rating: 5,
        review: 'Great quality ingredients, fast delivery!'
      };

      const response = await request(app)
        .post(`/api/orders/${orderId}/rating`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(ratingData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.order.rating.rating).toBe(5);
      expect(response.body.data.order.rating.review).toBe(ratingData.review);
    });

    it('should not add rating to non-completed order', async () => {
      // Create pending order
      const pendingOrder = new Order({
        buyerId,
        sellerId,
        items: [{
          ingredientId,
          ingredientName: 'Fresh Tomatoes',
          quantity: 5,
          pricePerUnit: 50
        }],
        totalAmount: 250,
        status: 'pending'
      });

      const savedPendingOrder = await pendingOrder.save();

      const ratingData = { rating: 5, review: 'Good' };

      const response = await request(app)
        .post(`/api/orders/${savedPendingOrder._id}/rating`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(ratingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('completed orders');
    });

    it('should not allow seller to rate order', async () => {
      const ratingData = { rating: 5, review: 'Good buyer' };

      const response = await request(app)
        .post(`/api/orders/${orderId}/rating`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(ratingData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should not add invalid rating', async () => {
      const invalidRatingData = { rating: 6, review: 'Good' }; // Rating should be 1-5

      const response = await request(app)
        .post(`/api/orders/${orderId}/rating`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(invalidRatingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('rating must be between 1 and 5');
    });
  });
});
        