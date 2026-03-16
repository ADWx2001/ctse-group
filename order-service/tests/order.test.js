const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

let mongoServer;
let app;

// Mock external services
jest.mock('../src/services/userService', () => ({
  validateToken: jest.fn().mockResolvedValue({
    valid: true,
    user: {
      id: 'user-123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'customer',
      phone: '+94771234567'
    }
  })
}));

jest.mock('../src/services/restaurantService', () => ({
  getRestaurant: jest.fn().mockResolvedValue({
    id: 'rest-123',
    name: 'Test Restaurant',
    is_active: true
  }),
  getMenuItem: jest.fn().mockResolvedValue({
    id: 'menu-item-1',
    name: 'Cheese Burger',
    price: 12.50,
    is_available: true,
    restaurant_id: 'rest-123'
  })
}));

jest.mock('../src/services/notificationService', () => ({
  sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
  sendStatusUpdate: jest.fn().mockResolvedValue(undefined)
}));

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.JWT_EXPIRES_IN = '1h';
  await mongoose.connect(process.env.MONGODB_URI);
  app = require('../src/app');
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

const generateTestToken = (userId = 'user-123', role = 'customer') => {
  return jwt.sign(
    { id: userId, role, name: 'Test User', email: 'test@example.com' },
    'test-secret-key',
    { expiresIn: '1h' }
  );
};

const validOrderPayload = {
  restaurantId: 'rest-123',
  items: [{ menuItemId: 'menu-item-1', quantity: 2 }],
  deliveryAddress: {
    street: '123 Test St',
    city: 'Colombo',
    zipCode: '10100'
  }
};

describe('POST /api/orders', () => {
  it('should create a new order with valid data', async () => {
    const token = generateTestToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(validOrderPayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('order');
    expect(res.body.order.status).toBe('pending');
    expect(res.body.order.totalAmount).toBe(25.0);
    expect(res.body.order.items).toHaveLength(1);
  });

  it('should reject order without authentication', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send(validOrderPayload);
    expect(res.status).toBe(401);
  });

  it('should reject order with missing items', async () => {
    const token = generateTestToken();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ restaurantId: 'rest-123', deliveryAddress: { street: '123', city: 'Colombo' } });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders', () => {
  it('should return empty list if no orders', async () => {
    const token = generateTestToken();
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  it('should return user orders after creating one', async () => {
    const token = generateTestToken();
    await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send(validOrderPayload);

    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
  });
});

describe('GET /health', () => {
  it('should return healthy status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('order-service');
  });
});
