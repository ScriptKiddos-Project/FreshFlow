import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Ingredient } from '../src/models/Ingredient';
import { connectDB, disconnectDB } from '../src/config/database';

describe('Ingredients Tests', () => {
  let vendorToken: string;
  let vendorId: string;
  let buyerToken: string;
  let buyerId: string;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Ingredient.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Ingredient.deleteMany({});

    // Create vendor
    const vendorData = {
      name: 'Test Vendor',
      email: 'vendor@example.com',
      password: 'Test123!@#',
      phone: '9876543210',
      role: 'vendor',
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.0760]
      },
      address: {
        street: 'Vendor Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001'
      }
    };

    const vendorResponse = await request(app)
      .post('/api/auth/register')
      .send(vendorData);

    vendorToken = vendorResponse.body.data.token;
    vendorId = vendorResponse.body.data.user._id;

    // Create buyer
    const buyerData = {
      name: 'Test Buyer',
      email: 'buyer@example.com',
      password: 'Test123!@#',
      phone: '9876543211',
      role: 'vendor',
      location: {
        type: 'Point',
        coordinates: [72.8777, 19.0760]
      },
      address: {
        street: 'Buyer Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002'
      }
    };

    const buyerResponse = await request(app)
      .post('/api/auth/register')
      .send(buyerData);

    buyerToken = buyerResponse.body.data.token;
    buyerId = buyerResponse.body.data.user._id;
  });

  describe('POST /api/ingredients', () => {
    const validIngredientData = {
      name: 'Fresh Tomatoes',
      category: 'vegetables',
      quantity: 10,
      unit: 'kg',
      basePrice: 50,
      currentPrice: 50,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      description: 'Fresh red tomatoes perfect for cooking',
      images: ['https://example.com/tomato.jpg'],
      minOrderQuantity: 1,
      location: {
        address: 'Market Street, Mumbai',
        coordinates: {
          latitude: 19.0760,
          longitude: 72.8777
        }
      }
    };

    it('should create ingredient successfully', async () => {
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(validIngredientData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredient).toHaveProperty('_id');
      expect(response.body.data.ingredient.name).toBe(validIngredientData.name);
      expect(response.body.data.ingredient.vendorId).toBe(vendorId);
      expect(response.body.data.ingredient.isActive).toBe(true);
      expect(response.body.data.ingredient.isAvailable).toBe(true);
    });

    it('should not create ingredient without authentication', async () => {
      const response = await request(app)
        .post('/api/ingredients')
        .send(validIngredientData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not create ingredient with invalid data', async () => {
      const invalidData = { ...validIngredientData, quantity: -1 };
      
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('quantity');
    });

    it('should not create ingredient with past expiry date', async () => {
      const invalidData = { 
        ...validIngredientData, 
        expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      };
      
      const response = await request(app)
        .post('/api/ingredients')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('expiry date');
    });
  });

  describe('GET /api/ingredients', () => {
    beforeEach(async () => {
      // Create test ingredients
      const ingredients = [
        {
          name: 'Fresh Tomatoes',
          category: 'vegetables',
          quantity: 10,
          unit: 'kg',
          basePrice: 50,
          originalPrice: 50,
          currentPrice: 50,
          vendorId,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          location: {
            address: 'Market Street, Mumbai',
            coordinates: { latitude: 19.0760, longitude: 72.8777 }
          },
          isActive: true,
          isAvailable: true
        },
        {
          name: 'Fresh Onions',
          category: 'vegetables',
          quantity: 5,
          unit: 'kg',
          basePrice: 30,
          originalPrice: 30,
          currentPrice: 25,
          vendorId,
          expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          location: {
            address: 'Market Street, Mumbai',
            coordinates: { latitude: 19.0760, longitude: 72.8777 }
          },
          isActive: true,
          isAvailable: true
        }
      ];

      await Ingredient.insertMany(ingredients);
    });

    it('should get all ingredients', async () => {
      const response = await request(app)
        .get('/api/ingredients')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredients).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter ingredients by category', async () => {
      const response = await request(app)
        .get('/api/ingredients?category=vegetables')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredients).toHaveLength(2);
      response.body.data.ingredients.forEach((ingredient: any) => {
        expect(ingredient.category).toBe('vegetables');
      });
    });

    it('should search ingredients by name', async () => {
      const response = await request(app)
        .get('/api/ingredients?search=tomato')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredients).toHaveLength(1);
      expect(response.body.data.ingredients[0].name).toContain('Tomatoes');
    });

    it('should filter ingredients by price range', async () => {
      const response = await request(app)
        .get('/api/ingredients?minPrice=20&maxPrice=40')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredients).toHaveLength(1);
      expect(response.body.data.ingredients[0].currentPrice).toBe(25);
    });

    it('should sort ingredients by price', async () => {
      const response = await request(app)
        .get('/api/ingredients?sortBy=currentPrice&sortOrder=asc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredients[0].currentPrice).toBeLessThanOrEqual(
        response.body.data.ingredients[1].currentPrice
      );
    });

    it('should get ingredients near location', async () => {
      const response = await request(app)
        .get('/api/ingredients?lat=19.0760&lng=72.8777&radius=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredients.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/ingredients/:id', () => {
    let ingredientId: string;

    beforeEach(async () => {
      const ingredient = new Ingredient({
        name: 'Fresh Tomatoes',
        category: 'vegetables',
        quantity: 10,
        unit: 'kg',
        basePrice: 50,
        originalPrice: 50,
        currentPrice: 50,
        vendorId,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: {
          address: 'Market Street, Mumbai',
          coordinates: { latitude: 19.0760, longitude: 72.8777 }
        },
        isActive: true,
        isAvailable: true
      });

      const saved = await ingredient.save();
      ingredientId = saved._id.toString();
    });

    it('should get ingredient by id', async () => {
      const response = await request(app)
        .get(`/api/ingredients/${ingredientId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredient._id).toBe(ingredientId);
      expect(response.body.data.ingredient.name).toBe('Fresh Tomatoes');
    });

    it('should return 404 for non-existent ingredient', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/ingredients/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid ingredient id', async () => {
      const response = await request(app)
        .get('/api/ingredients/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid ingredient ID');
    });
  });

  describe('PUT /api/ingredients/:id', () => {
    let ingredientId: string;

    beforeEach(async () => {
      const ingredient = new Ingredient({
        name: 'Fresh Tomatoes',
        category: 'vegetables',
        quantity: 10,
        unit: 'kg',
        basePrice: 50,
        originalPrice: 50,
        currentPrice: 50,
        vendorId,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: {
          address: 'Market Street, Mumbai',
          coordinates: { latitude: 19.0760, longitude: 72.8777 }
        },
        isActive: true,
        isAvailable: true
      });

      const saved = await ingredient.save();
      ingredientId = saved._id.toString();
    });

    it('should update ingredient by owner', async () => {
      const updateData = {
        quantity: 8,
        currentPrice: 45,
        description: 'Updated description'
      };

      const response = await request(app)
        .put(`/api/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ingredient.quantity).toBe(8);
      expect(response.body.data.ingredient.currentPrice).toBe(45);
      expect(response.body.data.ingredient.description).toBe('Updated description');
    });

    it('should not update ingredient by non-owner', async () => {
      const updateData = { quantity: 8 };

      const response = await request(app)
        .put(`/api/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });

    it('should not update ingredient without authentication', async () => {
      const updateData = { quantity: 8 };

      const response = await request(app)
        .put(`/api/ingredients/${ingredientId}`)
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should update ingredient availability when quantity changes', async () => {
      // Update to 0 quantity
      await request(app)
        .put(`/api/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ quantity: 0 })
        .expect(200);

      const ingredient = await Ingredient.findById(ingredientId);
      expect(ingredient?.isActive).toBe(false);
      expect(ingredient?.isAvailable).toBe(false);

      // Update to available quantity
      await request(app)
        .put(`/api/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ quantity: 3 })
        .expect(200);

      const updatedIngredient = await Ingredient.findById(ingredientId);
      expect(updatedIngredient?.quantity).toBe(3);
    });
  });

  describe('DELETE /api/ingredients/:id', () => {
    let ingredientId: string;

    beforeEach(async () => {
      const ingredient = new Ingredient({
        name: 'Fresh Tomatoes',
        category: 'vegetables',
        quantity: 10,
        unit: 'kg',
        basePrice: 50,
        originalPrice: 50,
        currentPrice: 50,
        vendorId,
        expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        location: {
          address: 'Market Street, Mumbai',
          coordinates: { latitude: 19.0760, longitude: 72.8777 }
        },
        isActive: true,
        isAvailable: true
      });

      const saved = await ingredient.save();
      ingredientId = saved._id.toString();
    });

    it('should delete ingredient by owner', async () => {
      const response = await request(app)
        .delete(`/api/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');

      const ingredient = await Ingredient.findById(ingredientId);
      // Soft delete - ingredient still exists but is inactive
      expect(ingredient?.isActive).toBe(false);
    });

    it('should not delete ingredient by non-owner', async () => {
      const response = await request(app)
        .delete(`/api/ingredients/${ingredientId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not authorized');
    });
  });
});