// backend/tests/auth.test.ts
import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { connectDB, disconnectDB } from '../src/config/database';
import jwt from 'jsonwebtoken';

describe('Authentication Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    const validUserData = {
      name: 'Test Vendor',
      email: 'test@example.com',
      password: 'Test123!@#',
      phone: '9876543210',
      role: 'vendor',
      location: {
        address: 'Test Street, Mumbai',
        coordinates: [72.8777, 19.0760],
        pincode: '400001'
      },
      businessDetails: {
        businessName: 'Test Food Stall',
        businessType: 'street_food',
        gstNumber: 'TEST123456789'
      }
    };

    it('should register a new vendor successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toHaveProperty('_id');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not register user with invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('should not register user with weak password', async () => {
      const invalidData = { ...validUserData, password: '123' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });

    it('should not register user with duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUserData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should not register user with invalid phone number', async () => {
      const invalidData = { ...validUserData, phone: '123' };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('phone');
    });
  });

  describe('POST /api/auth/login', () => {
    const userData = {
      name: 'Test Vendor',
      email: 'test@example.com',
      password: 'Test123!@#',
      phone: '9876543210',
      role: 'vendor',
      location: {
        address: 'Test Street, Mumbai',
        coordinates: [72.8777, 19.0760],
        pincode: '400001'
      }
    };

    beforeEach(async () => {
      // Register a user for login tests
      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: userData.password
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should update lastLoginAt on successful login', async () => {
      const beforeLogin = new Date();
      
      await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      const user = await User.findOne({ email: userData.email });
      expect(user?.lastLoginAt).toBeDefined();
      expect(user?.lastLoginAt!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = {
        name: 'Test Vendor',
        email: 'refresh@example.com',
        password: 'Test123!@#',
        phone: '9876543210',
        role: 'vendor'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send(userData);

      refreshToken = registerResponse.body.data.refreshToken;
      userId = registerResponse.body.data.user._id;
    });

    it('should refresh token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });

    it('should not refresh token with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const userData = {
        name: 'Test Vendor',
        email: 'logout@example.com',
        password: 'Test123!@#',
        phone: '9876543210',
        role: 'vendor'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = response.body.data.token;
      refreshToken = response.body.data.refreshToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should not logout without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      const userData = {
        name: 'Test Vendor',
        email: 'forgot@example.com',
        password: 'Test123!@#',
        phone: '9876543210',
        role: 'vendor'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);
    });

    it('should send reset password email for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link sent');
    });

    it('should handle non-existent email gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset link sent');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      const userData = {
        name: 'Test Vendor',
        email: 'reset@example.com',
        password: 'Test123!@#',
        phone: '9876543210',
        role: 'vendor'
      };

      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Generate reset token
      const user = await User.findOne({ email: 'reset@example.com' });
      resetToken = jwt.sign(
        { userId: user?._id, type: 'password_reset' },
        process.env.JWT_SECRET!,
        { expiresIn: '1h' }
      );

      // Save reset token to user
      await User.findByIdAndUpdate(user?._id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: new Date(Date.now() + 3600000)
      });
    });

    it('should reset password with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: 'NewPassword123!@#'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password reset successfully');

      // Verify login with new password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset@example.com',
          password: 'NewPassword123!@#'
        })
        .expect(200);
    });

    it('should not reset password with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          password: 'NewPassword123!@#'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    it('should not reset password with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          password: '123'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('password');
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const userData = {
        name: 'Test Vendor',
        email: 'me@example.com',
        password: 'Test123!@#',
        phone: '9876543210',
        role: 'vendor'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      authToken = response.body.data.token;
      userId = response.body.data.user._id;
    });

    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user._id).toBe(userId);
      expect(response.body.data.user.email).toBe('me@example.com');
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not get user without authentication', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should not get user with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});