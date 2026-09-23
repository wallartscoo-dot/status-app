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

async function seedCategory(key: string, label: string) {
  const { rows } = await pool.query(
    "INSERT INTO categories (key, label, emoji, sort_order) VALUES ($1, $2, '🎬', 0) RETURNING id",
    [key, label]
  );
  return rows[0].id as string;
}

async function seedStatus(creatorId: string, categoryId: string, title: string, opts: Partial<{ downloadCount: number; viewCount: number }> = {}) {
  const { rows } = await pool.query(
    `INSERT INTO statuses (title, type, media_url, thumbnail_url, duration_sec, view_count, download_count, visibility, creator_id, category_id)
     VALUES ($1, 'VIDEO', 'https://example.com/v.mp4', 'https://example.com/t.jpg', 10, $2, $3, 'PUBLISHED', $4, $5)
     RETURNING id`,
    [title, opts.viewCount ?? 0, opts.downloadCount ?? 0, creatorId, categoryId]
  );
  return rows[0].id as string;
}

describe("Statuses & Favorites", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("GET /api/statuses", () => {
    it("lists published statuses, paginated", async () => {
      const { userId } = await signupAndLogin("creator1");
      const catId = await seedCategory("funny", "Funny");
      await seedStatus(userId, catId, "Status A");
      await seedStatus(userId, catId, "Status B");

      const res = await request(app).get("/api/statuses?page=1&limit=10");
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("does not require authentication", async () => {
      const res = await request(app).get("/api/statuses");
      expect(res.status).toBe(200);
    });
  });

  describe("GET /api/statuses/trending", () => {
    it("sorts by download count descending", async () => {
      const { userId } = await signupAndLogin("creator2");
      const catId = await seedCategory("motivation", "Motivation");
      await seedStatus(userId, catId, "Low", { downloadCount: 5 });
      await seedStatus(userId, catId, "High", { downloadCount: 500 });

      const res = await request(app).get("/api/statuses/trending?limit=10");
      expect(res.status).toBe(200);
      expect(res.body.items[0].title).toBe("High");
    });
  });

  describe("GET /api/statuses/search", () => {
    it("matches by title substring, case-insensitive", async () => {
      const { userId } = await signupAndLogin("creator3");
      const loveId = await seedCategory("love", "Love");
      const funnyId = await seedCategory("funny3", "Funny 3");
      await seedStatus(userId, loveId, "Falling in Love");
      // Deliberately a different, unrelated category — "love" must not
      // match this one via the category-label search path (see
      // status.service.ts's searchStatuses, which also matches category
      // label per spec section 9: search by title/category/hashtags/creator).
      await seedStatus(userId, funnyId, "Totally Unrelated");

      const res = await request(app).get("/api/statuses/search?q=love");
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe("Falling in Love");
    });
  });

  describe("GET /api/statuses/category/:category", () => {
    it("filters to only that category", async () => {
      const { userId } = await signupAndLogin("creator4");
      const funnyId = await seedCategory("funny2", "Funny 2");
      const sadId = await seedCategory("sad2", "Sad 2");
      await seedStatus(userId, funnyId, "Funny One");
      await seedStatus(userId, sadId, "Sad One");

      const res = await request(app).get("/api/statuses/category/funny2");
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].title).toBe("Funny One");
    });
  });

  describe("Favorites", () => {
    it("requires authentication to favorite", async () => {
      const { userId } = await signupAndLogin("creator5");
      const catId = await seedCategory("cat5", "Cat 5");
      const statusId = await seedStatus(userId, catId, "Status");

      const res = await request(app).post(`/api/statuses/${statusId}/favorite`);
      expect(res.status).toBe(401);
    });

    it("adds, is idempotent, then removes a favorite", async () => {
      const { userId, token: creatorToken } = await signupAndLogin("creator6");
      const { token } = await signupAndLogin("fan6");
      const catId = await seedCategory("cat6", "Cat 6");
      const statusId = await seedStatus(userId, catId, "Status");

      const first = await request(app)
        .post(`/api/statuses/${statusId}/favorite`)
        .set("Authorization", `Bearer ${token}`);
      expect(first.status).toBe(201);
      expect(first.body.alreadyFavorited).toBe(false);

      const second = await request(app)
        .post(`/api/statuses/${statusId}/favorite`)
        .set("Authorization", `Bearer ${token}`);
      // 200, not 201: this is a no-op on an already-favorited status, not a
      // new creation — see favorite.controller.ts's addFavorite.
      expect(second.status).toBe(200);
      expect(second.body.alreadyFavorited).toBe(true);

      const list = await request(app).get("/api/favorites").set("Authorization", `Bearer ${token}`);
      expect(list.body.items).toHaveLength(1);

      const del = await request(app)
        .delete(`/api/statuses/${statusId}/favorite`)
        .set("Authorization", `Bearer ${token}`);
      expect(del.status).toBe(204);

      const listAfter = await request(app).get("/api/favorites").set("Authorization", `Bearer ${token}`);
      expect(listAfter.body.items).toHaveLength(0);

      // Creator gets notified about the favorite (before it was removed)
      const notifs = await request(app)
        .get("/api/notifications")
        .set("Authorization", `Bearer ${creatorToken}`);
      expect(notifs.body.items.some((n: any) => n.type === "FAVORITE")).toBe(true);
    });

    it("404s favoriting a nonexistent status", async () => {
      const { token } = await signupAndLogin("fan7");
      const res = await request(app)
        .post("/api/statuses/00000000-0000-0000-0000-000000000000/favorite")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
