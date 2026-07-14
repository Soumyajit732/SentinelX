jest.mock("../../src/services/userService");
jest.mock("../../src/services/demoService");
jest.mock("../../src/db/pool");

// Must be set before app is required so jwt.sign uses a predictable secret
process.env.JWT_SECRET = "test-secret-for-jest";

const request = require("supertest");
const bcrypt = require("bcrypt");
const app = require("../../src/app");
const userService = require("../../src/services/userService");
const demoService = require("../../src/services/demoService");

// ─── POST /api/auth/register ──────────────────────────────────────────────

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.resetAllMocks());

  it("201 — creates user and returns it", async () => {
    userService.findUserByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "uuid-1",
      email: "new@example.com",
      created_at: new Date().toISOString(),
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "new@example.com", password: "securepass" });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe("User registered successfully");
    expect(res.body.user.email).toBe("new@example.com");
  });

  it("409 — rejects duplicate email", async () => {
    userService.findUserByEmail.mockResolvedValue({ id: "uuid-1", email: "dup@example.com" });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "dup@example.com", password: "securepass" });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email is already registered");
  });

  it("400 — rejects email without @", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "notanemail", password: "securepass" });

    expect(res.status).toBe(400);
  });

  it("400 — rejects password shorter than 8 characters", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "valid@example.com", password: "short" });

    expect(res.status).toBe(400);
  });

  it("400 — rejects empty body", async () => {
    const res = await request(app).post("/api/auth/register").send({});

    expect(res.status).toBe(400);
  });

  it("normalizes email to lowercase before storing", async () => {
    userService.findUserByEmail.mockResolvedValue(null);
    userService.createUser.mockResolvedValue({
      id: "uuid-2",
      email: "lower@example.com",
      created_at: new Date().toISOString(),
    });

    await request(app)
      .post("/api/auth/register")
      .send({ email: "  LOWER@EXAMPLE.COM  ", password: "securepass" });

    expect(userService.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: "lower@example.com" })
    );
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────

describe("POST /api/auth/login", () => {
  let passwordHash;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash("correctpass", 10);
  });

  beforeEach(() => jest.resetAllMocks());

  const baseUser = () => ({
    id: "uuid-1",
    email: "user@example.com",
    password: passwordHash,
    token_version: 1,
    blocked_until: null,
    created_at: new Date().toISOString(),
  });

  it("200 — returns token on correct credentials", async () => {
    userService.findUserByEmail.mockResolvedValue(baseUser());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "correctpass" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Login successful");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(0);
  });

  it("401 — rejects when user does not exist", async () => {
    userService.findUserByEmail.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "anypass" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("401 — rejects wrong password", async () => {
    userService.findUserByEmail.mockResolvedValue(baseUser());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("400 — rejects missing password field", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@example.com" });

    expect(res.status).toBe(400);
  });

  it("400 — rejects missing email field", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "somepass" });

    expect(res.status).toBe(400);
  });
});

// ─── POST /api/auth/demo-login ────────────────────────────────────────────

describe("POST /api/auth/demo-login", () => {
  beforeEach(() => jest.resetAllMocks());

  const demoUser = () => ({
    id: "demo-uuid",
    email: "demo@sentinelx.io",
    token_version: 3,
    blocked_until: null,
    created_at: new Date().toISOString(),
  });

  it("200 — returns a token without requiring credentials", async () => {
    demoService.resetDemoSession.mockResolvedValue(demoUser());

    const res = await request(app).post("/api/auth/demo-login").send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Demo session started");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.user.email).toBe("demo@sentinelx.io");
  });

  it("500 — surfaces a clean error if the reset fails", async () => {
    demoService.resetDemoSession.mockRejectedValue(new Error("db unavailable"));

    const res = await request(app).post("/api/auth/demo-login").send({});

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Unable to start demo session");
  });

  it("429 — rate-limits repeated demo-login calls from the same IP", async () => {
    demoService.resetDemoSession.mockResolvedValue(demoUser());

    let lastStatus;
    for (let i = 0; i < 8; i++) {
      // eslint-disable-next-line no-await-in-loop
      lastStatus = (await request(app).post("/api/auth/demo-login").send({})).status;
    }

    expect(lastStatus).toBe(429);
  });
});

// ─── POST /api/auth/demo-reactivate ───────────────────────────────────────

describe("POST /api/auth/demo-reactivate", () => {
  beforeEach(() => jest.resetAllMocks());

  const demoUser = () => ({
    id: "demo-uuid",
    email: "demo@sentinelx.io",
    token_version: 4,
    blocked_until: null,
    created_at: new Date().toISOString(),
  });

  it("200 — restores access without resetting history", async () => {
    demoService.reactivateDemoSession.mockResolvedValue(demoUser());

    const res = await request(app).post("/api/auth/demo-reactivate").send({});

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Demo session reactivated");
    expect(typeof res.body.token).toBe("string");
    expect(demoService.resetDemoSession).not.toHaveBeenCalled();
  });

  it("500 — surfaces a clean error if reactivation fails", async () => {
    demoService.reactivateDemoSession.mockRejectedValue(new Error("db unavailable"));

    const res = await request(app).post("/api/auth/demo-reactivate").send({});

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Unable to reactivate demo session");
  });
});
