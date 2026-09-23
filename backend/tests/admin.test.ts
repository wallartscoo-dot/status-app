import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { pool } from "../src/config/db";
import { truncateAll } from "./setup";

const app = createApp();

async function signupAndLogin(username: string) {
  const res = await request(app)
    .post("/api/auth/signup")
    .send({
      fullName: `User ${username}`,
      username,
      email: `${username}@example.com`,
      password: "Password123",
      confirmPassword: "Password123",
    });
  return { token: res.body.accessToken as string, userId: res.body.user.id as string };
}

async function makeAdmin(userId: string) {
  await pool.query("UPDATE users SET role = 'ADMIN' WHERE id = $1", [userId]);
}

describe("Admin", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await pool.end();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const res = await request(app).get("/api/admin/analytics");
    expect(res.status).toBe(401);
  });

  it("rejects non-admin users with 403", async () => {
    const { token } = await signupAndLogin("regular1");
    const res = await request(app).get("/api/admin/analytics").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("allows an admin to view analytics", async () => {
    const { token, userId } = await signupAndLogin("admin1");
    await makeAdmin(userId);

    const res = await request(app).get("/api/admin/analytics").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.analytics.totalUsers).toBe(1);
  });

  it("bans a user, who is then blocked from logging in", async () => {
    const { token: adminToken, userId: adminId } = await signupAndLogin("admin2");
    await makeAdmin(adminId);
    const { userId: targetId } = await signupAndLogin("target2");

    const ban = await request(app)
      .patch(`/api/admin/users/${targetId}/ban`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ banned: true });
    expect(ban.status).toBe(200);
    expect(ban.body.user.isBanned).toBe(true);

    const login = await request(app)
      .post("/api/auth/login")
      .send({ identifier: "target2", password: "Password123" });
    expect(login.status).toBe(403);
  });

  it("moderates a status: reject hides it from the public feed, restore brings it back", async () => {
    const { token: adminToken, userId: adminId } = await signupAndLogin("admin3");
    await makeAdmin(adminId);
    const { token: creatorToken } = await signupAndLogin("creator3");

    const { rows: catRows } = await pool.query(
      "INSERT INTO categories (key, label, emoji, sort_order) VALUES ('modtest', 'Mod Test', '🎬', 0) RETURNING id"
    );
    const { rows: statusRows } = await pool.query(
      `INSERT INTO statuses (title, type, media_url, thumbnail_url, duration_sec, visibility, creator_id, category_id)
       SELECT 'Test Status', 'VIDEO', 'https://example.com/v.mp4', NULL, 10, 'PUBLISHED', id, $1
       FROM users WHERE username = 'creator3'
       RETURNING id`,
      [catRows[0].id]
    );
    const statusId = statusRows[0].id;

    const reject = await request(app)
      .patch(`/api/admin/statuses/${statusId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ visibility: "REJECTED" });
    expect(reject.status).toBe(200);

    const publicList = await request(app).get("/api/statuses");
    expect(publicList.body.items.find((s: any) => s.id === statusId)).toBeUndefined();

    const restore = await request(app)
      .patch(`/api/admin/statuses/${statusId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ visibility: "PUBLISHED" });
    expect(restore.status).toBe(200);

    const publicListAfter = await request(app).get("/api/statuses");
    expect(publicListAfter.body.items.find((s: any) => s.id === statusId)).toBeDefined();

    void creatorToken; // (kept for readability of what created the status)
  });

  it("reviews a report: open -> dismissed", async () => {
    const { token: adminToken, userId: adminId } = await signupAndLogin("admin4");
    await makeAdmin(adminId);
    const { token: reporterToken, userId: creatorId } = await signupAndLogin("creator4");

    const { rows: catRows } = await pool.query(
      "INSERT INTO categories (key, label, emoji, sort_order) VALUES ('reporttest', 'Report Test', '🎬', 0) RETURNING id"
    );
    const { rows: statusRows } = await pool.query(
      `INSERT INTO statuses (title, type, media_url, visibility, creator_id, category_id)
       VALUES ('Reportable', 'VIDEO', 'https://example.com/v.mp4', 'PUBLISHED', $1, $2) RETURNING id`,
      [creatorId, catRows[0].id]
    );
    const statusId = statusRows[0].id;

    const report = await request(app)
      .post(`/api/statuses/${statusId}/report`)
      .set("Authorization", `Bearer ${reporterToken}`)
      .send({ reason: "SPAM", details: "looks spammy" });
    expect(report.status).toBe(201);

    const openReports = await request(app)
      .get("/api/admin/reports?state=OPEN")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(openReports.body.total).toBe(1);

    const reportId = openReports.body.items[0].id;
    const dismiss = await request(app)
      .patch(`/api/admin/reports/${reportId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ state: "DISMISSED" });
    expect(dismiss.status).toBe(200);
    expect(dismiss.body.report.state).toBe("DISMISSED");
  });
});
