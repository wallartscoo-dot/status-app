import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { truncateAll } from "./setup";

const app = createApp();

const validSignup = {
  fullName: "Test User",
  username: "testuser",
  email: "test@example.com",
  password: "Password123",
  confirmPassword: "Password123",
};

describe("Auth", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("POST /api/auth/signup", () => {
    it("creates a user and returns tokens", async () => {
      const res = await request(app).post("/api/auth/signup").send(validSignup);

      expect(res.status).toBe(201);
      expect(res.body.user.username).toBe("testuser");
      expect(res.body.user.email).toBe("test@example.com");
      expect(res.body.user.profile.totalDownloads).toBe(0);
      expect(res.body.accessToken).toBeTruthy();
      expect(res.body.refreshToken).toBeTruthy();
      // Password must never be echoed back
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it("creates a WELCOME notification on signup", async () => {
      const signup = await request(app).post("/api/auth/signup").send(validSignup);
      const token = signup.body.accessToken;

      const res = await request(app).get("/api/notifications").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].type).toBe("WELCOME");
    });

    it("rejects a duplicate email with 409", async () => {
      await request(app).post("/api/auth/signup").send(validSignup);
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, username: "different" });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/email/i);
    });

    it("rejects a duplicate username with 409", async () => {
      await request(app).post("/api/auth/signup").send(validSignup);
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, email: "different@example.com" });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/username/i);
    });

    it("rejects an invalid email with 400", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, email: "not-an-email" });
      expect(res.status).toBe(400);
    });

    it("rejects a too-short password with 400", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, password: "short", confirmPassword: "short" });
      expect(res.status).toBe(400);
    });

    it("rejects mismatched passwords with 400", async () => {
      const res = await request(app)
        .post("/api/auth/signup")
        .send({ ...validSignup, confirmPassword: "SomethingElse123" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/signup").send(validSignup);
    });

    it("logs in with username + password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "testuser", password: "Password123" });
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeTruthy();
    });

    it("logs in with email + password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "test@example.com", password: "Password123" });
      expect(res.status).toBe(200);
    });

    it("rejects a wrong password with 401", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "testuser", password: "WrongPassword" });
      expect(res.status).toBe(401);
    });

    it("rejects a nonexistent identifier with 401 (not 404 — don't leak which part was wrong)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "nobody", password: "Password123" });
      expect(res.status).toBe(401);
    });

    it("blocks a banned user from logging in", async () => {
      await pool.query("UPDATE users SET is_banned = TRUE WHERE username = 'testuser'");
      const res = await request(app)
        .post("/api/auth/login")
        .send({ identifier: "testuser", password: "Password123" });
      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/users/me", () => {
    it("requires authentication", async () => {
      const res = await request(app).get("/api/users/me");
      expect(res.status).toBe(401);
    });

    it("returns the current user for a valid token", async () => {
      const signup = await request(app).post("/api/auth/signup").send(validSignup);
      const res = await request(app)
        .get("/api/users/me")
        .set("Authorization", `Bearer ${signup.body.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe("testuser");
    });

    it("rejects a garbage token with 401", async () => {
      const res = await request(app).get("/api/users/me").set("Authorization", "Bearer garbage.token.here");
      expect(res.status).toBe(401);
    });
  });
});
