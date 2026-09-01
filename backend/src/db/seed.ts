import "dotenv/config";
import { pool } from "../config/db";
import { hashPassword } from "../utils/password";

// Matches spec section 8 ("Categories") — key/label/emoji, in display order.
const CATEGORIES: { key: string; label: string; emoji: string }[] = [
  { key: "love", label: "Love", emoji: "❤️" },
  { key: "romantic", label: "Romantic", emoji: "💕" },
  { key: "sad", label: "Sad", emoji: "😢" },
  { key: "breakup", label: "Breakup", emoji: "💔" },
  { key: "attitude", label: "Attitude", emoji: "😎" },
  { key: "motivation", label: "Motivation", emoji: "💪" },
  { key: "friendship", label: "Friendship", emoji: "🤝" },
  { key: "funny", label: "Funny", emoji: "😂" },
  { key: "islamic", label: "Islamic", emoji: "🕌" },
  { key: "birthday", label: "Birthday", emoji: "🎂" },
  { key: "good-morning", label: "Good Morning", emoji: "🌅" },
  { key: "good-night", label: "Good Night", emoji: "🌙" },
  { key: "poetry", label: "Poetry", emoji: "🖋️" },
  { key: "quotes", label: "Quotes", emoji: "💬" },
  { key: "aesthetic", label: "Aesthetic", emoji: "🌸" },
  { key: "trending", label: "Trending", emoji: "🔥" },
  { key: "viral", label: "Viral", emoji: "⚡" },
  { key: "festival", label: "Festival", emoji: "🎉" },
  { key: "sports", label: "Sports", emoji: "🏆" },
  { key: "travel", label: "Travel", emoji: "✈️" },
];

async function main() {
  console.log("Seeding categories ...");
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await pool.query(
      `INSERT INTO categories (key, label, emoji, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order`,
      [c.key, c.label, c.emoji, i]
    );
  }
  console.log(`✅ Seeded ${CATEGORIES.length} categories.`);

  // Demo admin account so the admin dashboard (Phase 4) has something to log
  // in with right away. Change/remove this before deploying to production.
  const demoEmail = "admin@statusapp.dev";
  const existing = await pool.query("SELECT id FROM users WHERE email = $1", [demoEmail]);
  if (existing.rowCount === 0) {
    const passwordHash = await hashPassword("ChangeMe123!");
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, 'ADMIN') RETURNING id`,
      ["Demo Admin", "admin", demoEmail, passwordHash]
    );
    await pool.query(`INSERT INTO profiles (user_id) VALUES ($1)`, [rows[0].id]);
    console.log(`✅ Created demo admin: ${demoEmail} / ChangeMe123!`);
  } else {
    console.log("ℹ️  Demo admin already exists, skipping.");
  }

  // Demo creator + sample statuses so /trending, /search, /category/:key and
  // favorites have real rows to exercise in Phase 2 without waiting on
  // Phase 3's upload pipeline. Placeholder media points at picsum/sample
  // video URLs — swap for real cloud-storage URLs once uploads exist.
  const creatorEmail = "creator@statusapp.dev";
  let creatorId: string;
  const existingCreator = await pool.query("SELECT id FROM users WHERE email = $1", [creatorEmail]);
  if (existingCreator.rowCount === 0) {
    const passwordHash = await hashPassword("ChangeMe123!");
    const { rows } = await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, is_creator)
       VALUES ($1, $2, $3, $4, 'USER', TRUE) RETURNING id`,
      ["Demo Creator", "demo_creator", creatorEmail, passwordHash]
    );
    creatorId = rows[0].id;
    await pool.query(`INSERT INTO profiles (user_id, bio) VALUES ($1, $2)`, [
      creatorId,
      "Posting fresh statuses daily ✨",
    ]);
    console.log(`✅ Created demo creator: ${creatorEmail} / ChangeMe123!`);
  } else {
    creatorId = existingCreator.rows[0].id;
    console.log("ℹ️  Demo creator already exists, skipping.");
  }

  const SAMPLE_STATUSES: {
    title: string;
    description: string;
    type: "VIDEO" | "IMAGE" | "QUOTE";
    categoryKey: string;
    durationSec: number | null;
    views: number;
    downloads: number;
  }[] = [
    { title: "Chasing sunsets 🌅", description: "Golden hour hits different", type: "VIDEO", categoryKey: "aesthetic", durationSec: 15, views: 12400, downloads: 3210 },
    { title: "That attitude tho 😎", description: "Not everyone gets this energy", type: "VIDEO", categoryKey: "attitude", durationSec: 12, views: 9800, downloads: 2870 },
    { title: "Rise and grind 💪", description: "Motivation for the grind", type: "VIDEO", categoryKey: "motivation", durationSec: 20, views: 15200, downloads: 4100 },
    { title: "Missing you tonight 💔", description: "Every love story isn't a fairy tale", type: "QUOTE", categoryKey: "breakup", durationSec: null, views: 7600, downloads: 1900 },
    { title: "Good morning sunshine ☀️", description: "Start the day right", type: "IMAGE", categoryKey: "good-morning", durationSec: null, views: 5400, downloads: 1200 },
    { title: "Best friends forever 🤝", description: "Ride or die squad", type: "VIDEO", categoryKey: "friendship", durationSec: 18, views: 8300, downloads: 2000 },
    { title: "Laugh it off 😂", description: "When the joke lands perfectly", type: "VIDEO", categoryKey: "funny", durationSec: 10, views: 21000, downloads: 6300 },
    { title: "Falling for you 💕", description: "Romance in 30 seconds", type: "VIDEO", categoryKey: "romantic", durationSec: 25, views: 11200, downloads: 3400 },
  ];

  console.log("Seeding sample statuses ...");
  for (const s of SAMPLE_STATUSES) {
    const catRes = await pool.query("SELECT id FROM categories WHERE key = $1", [s.categoryKey]);
    if (catRes.rowCount === 0) continue;
    const categoryId = catRes.rows[0].id;

    const existingStatus = await pool.query("SELECT id FROM statuses WHERE title = $1", [s.title]);
    if (existingStatus.rowCount && existingStatus.rowCount > 0) continue;

    const seed = Math.floor(Math.random() * 1000);
    const mediaUrl =
      s.type === "VIDEO"
        ? "https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"
        : `https://picsum.photos/seed/${seed}/720/1280`;
    const thumbnailUrl = `https://picsum.photos/seed/${seed}/360/640`;

    await pool.query(
      `INSERT INTO statuses
        (title, description, type, media_url, thumbnail_url, duration_sec, view_count, download_count, visibility, creator_id, category_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PUBLISHED',$9,$10)`,
      [s.title, s.description, s.type, mediaUrl, thumbnailUrl, s.durationSec, s.views, s.downloads, creatorId, categoryId]
    );
  }
  console.log(`✅ Seeded ${SAMPLE_STATUSES.length} sample statuses.`);

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
