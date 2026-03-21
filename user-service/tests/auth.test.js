const { MongoMemoryServer } = require("mongodb-memory-server");
const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../src/app");

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-secret-key";
  process.env.JWT_EXPIRES_IN = "1h";
  await mongoose.connect(process.env.MONGODB_URI);
});

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

describe("POST /api/auth/register", () => {
  const validUser = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123",
    role: "customer",
  };

  it("should register a new user and return a token", async () => {
    const res = await request(app).post("/api/auth/register").send(validUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("should return 409 if email already exists", async () => {
    await request(app).post("/api/auth/register").send(validUser);
    const res = await request(app).post("/api/auth/register").send(validUser);
    expect(res.status).toBe(409);
  });

  it("should return 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(400);
  });

  it("should return 400 for weak password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, password: "12345678" });
    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...validUser, email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "login@example.com",
      password: "Password123",
    });
  });

  it("should login with valid credentials and return token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "Password123" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user.email).toBe("login@example.com");
  });

  it("should return 401 for wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "WrongPass123" });
    expect(res.status).toBe(401);
  });

  it("should return 401 for non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "Password123" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/profile", () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post("/api/auth/register").send({
      name: "Profile User",
      email: "profile@example.com",
      password: "Password123",
    });
    token = res.body.token;
  });

  it("should return user profile when authenticated", async () => {
    const res = await request(app)
      .get("/api/users/profile")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe("profile@example.com");
    expect(res.body.user).not.toHaveProperty("password");
  });

  it("should return 401 without token", async () => {
    const res = await request(app).get("/api/users/profile");
    expect(res.status).toBe(401);
  });
});

describe("GET /health", () => {
  it("should return healthy status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });
});
