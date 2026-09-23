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

  await seedSoundLibrary();

  await pool.end();
}

// ---------------------------------------------------------------------------
// Sound Library (Music + Islamic Audio) — spec section 15 ("Backend /
// Database"). Audio URLs below are freely-licensed demo/placeholder tracks
// (SoundHelix's public test catalogue) so the library is fully browsable,
// searchable, previewable and trimmable out of the box; every row's
// `source`/`license_note` says plainly that it's a placeholder so nobody
// mistakes it for a cleared recording — swap in your licensed catalogue and
// real (permitted) Quran/Naat/Hamd recitations before shipping to
// production, per spec section 14 ("Content & Rights").
// ---------------------------------------------------------------------------

const DEMO_TRACK = (n: number) => `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${n}.mp3`;
const DEMO_ARTWORK = (seed: string) => `https://picsum.photos/seed/${seed}/400/400`;
const PLACEHOLDER_NOTE =
  "Demo placeholder track — replace with a properly licensed / royalty-free / public-domain recording before production.";

const GENRES: { key: string; label: string }[] = [
  { key: "pop", label: "Pop" },
  { key: "hiphop", label: "Hip-Hop" },
  { key: "lofi", label: "Lo-Fi" },
  { key: "cinematic", label: "Cinematic" },
  { key: "edm", label: "EDM" },
  { key: "acoustic", label: "Acoustic" },
  { key: "chill", label: "Chill" },
];

const MOODS: { key: string; label: string; emoji: string }[] = [
  { key: "happy", label: "Happy", emoji: "😄" },
  { key: "sad", label: "Sad", emoji: "😢" },
  { key: "energetic", label: "Energetic", emoji: "⚡" },
  { key: "romantic", label: "Romantic", emoji: "❤️" },
  { key: "chill", label: "Chill", emoji: "😌" },
  { key: "epic", label: "Epic", emoji: "🔥" },
  { key: "peaceful", label: "Peaceful", emoji: "🕊️" },
];

const ARTISTS: { name: string; role: "ARTIST" | "RECITER" }[] = [
  { name: "Nova Ray", role: "ARTIST" },
  { name: "The Midnight Keys", role: "ARTIST" },
  { name: "Lush Avenue", role: "ARTIST" },
  { name: "Echo & Wren", role: "ARTIST" },
  { name: "Demo Reciter — Ahmad", role: "RECITER" },
  { name: "Demo Reciter — Bilal", role: "RECITER" },
  { name: "Demo Naat Ensemble", role: "RECITER" },
];

// Standard 114-Surah index: number, Arabic name, transliteration, English
// name, ayat count, revelation place — kept accurate per spec section 13.
const SURAHS: [number, string, string, string, number, "MECCA" | "MEDINA"][] = [
  [1, "الفاتحة", "Al-Fatihah", "The Opening", 7, "MECCA"],
  [2, "البقرة", "Al-Baqarah", "The Cow", 286, "MEDINA"],
  [3, "آل عمران", "Aal-E-Imran", "The Family of Imran", 200, "MEDINA"],
  [4, "النساء", "An-Nisa", "The Women", 176, "MEDINA"],
  [5, "المائدة", "Al-Ma'idah", "The Table Spread", 120, "MEDINA"],
  [6, "الأنعام", "Al-An'am", "The Cattle", 165, "MECCA"],
  [7, "الأعراف", "Al-A'raf", "The Heights", 206, "MECCA"],
  [8, "الأنفال", "Al-Anfal", "The Spoils of War", 75, "MEDINA"],
  [9, "التوبة", "At-Tawbah", "The Repentance", 129, "MEDINA"],
  [10, "يونس", "Yunus", "Jonah", 109, "MECCA"],
  [11, "هود", "Hud", "Hud", 123, "MECCA"],
  [12, "يوسف", "Yusuf", "Joseph", 111, "MECCA"],
  [13, "الرعد", "Ar-Ra'd", "The Thunder", 43, "MEDINA"],
  [14, "ابراهيم", "Ibrahim", "Abraham", 52, "MECCA"],
  [15, "الحجر", "Al-Hijr", "The Rocky Tract", 99, "MECCA"],
  [16, "النحل", "An-Nahl", "The Bee", 128, "MECCA"],
  [17, "الإسراء", "Al-Isra", "The Night Journey", 111, "MECCA"],
  [18, "الكهف", "Al-Kahf", "The Cave", 110, "MECCA"],
  [19, "مريم", "Maryam", "Mary", 98, "MECCA"],
  [20, "طه", "Taha", "Ta-Ha", 135, "MECCA"],
  [21, "الأنبياء", "Al-Anbiya", "The Prophets", 112, "MECCA"],
  [22, "الحج", "Al-Hajj", "The Pilgrimage", 78, "MEDINA"],
  [23, "المؤمنون", "Al-Mu'minun", "The Believers", 118, "MECCA"],
  [24, "النور", "An-Nur", "The Light", 64, "MEDINA"],
  [25, "الفرقان", "Al-Furqan", "The Criterion", 77, "MECCA"],
  [26, "الشعراء", "Ash-Shu'ara", "The Poets", 227, "MECCA"],
  [27, "النمل", "An-Naml", "The Ants", 93, "MECCA"],
  [28, "القصص", "Al-Qasas", "The Stories", 88, "MECCA"],
  [29, "العنكبوت", "Al-Ankabut", "The Spider", 69, "MECCA"],
  [30, "الروم", "Ar-Rum", "The Romans", 60, "MECCA"],
  [31, "لقمان", "Luqman", "Luqman", 34, "MECCA"],
  [32, "السجدة", "As-Sajdah", "The Prostration", 30, "MECCA"],
  [33, "الأحزاب", "Al-Ahzab", "The Combined Forces", 73, "MEDINA"],
  [34, "سبأ", "Saba", "Sheba", 54, "MECCA"],
  [35, "فاطر", "Fatir", "Originator", 45, "MECCA"],
  [36, "يس", "Ya-Sin", "Ya Sin", 83, "MECCA"],
  [37, "الصافات", "As-Saffat", "Those Who Set The Ranks", 182, "MECCA"],
  [38, "ص", "Sad", "The Letter \"Sad\"", 88, "MECCA"],
  [39, "الزمر", "Az-Zumar", "The Troops", 75, "MECCA"],
  [40, "غافر", "Ghafir", "The Forgiver", 85, "MECCA"],
  [41, "فصلت", "Fussilat", "Explained In Detail", 54, "MECCA"],
  [42, "الشورى", "Ash-Shura", "The Consultation", 53, "MECCA"],
  [43, "الزخرف", "Az-Zukhruf", "The Ornaments of Gold", 89, "MECCA"],
  [44, "الدخان", "Ad-Dukhan", "The Smoke", 59, "MECCA"],
  [45, "الجاثية", "Al-Jathiyah", "The Crouching", 37, "MECCA"],
  [46, "الأحقاف", "Al-Ahqaf", "The Wind-Curved Sandhills", 35, "MECCA"],
  [47, "محمد", "Muhammad", "Muhammad", 38, "MEDINA"],
  [48, "الفتح", "Al-Fath", "The Victory", 29, "MEDINA"],
  [49, "الحجرات", "Al-Hujurat", "The Rooms", 18, "MEDINA"],
  [50, "ق", "Qaf", "The Letter \"Qaf\"", 45, "MECCA"],
  [51, "الذاريات", "Adh-Dhariyat", "The Winnowing Winds", 60, "MECCA"],
  [52, "الطور", "At-Tur", "The Mount", 49, "MECCA"],
  [53, "النجم", "An-Najm", "The Star", 62, "MECCA"],
  [54, "القمر", "Al-Qamar", "The Moon", 55, "MECCA"],
  [55, "الرحمن", "Ar-Rahman", "The Beneficent", 78, "MEDINA"],
  [56, "الواقعة", "Al-Waqi'ah", "The Inevitable", 96, "MECCA"],
  [57, "الحديد", "Al-Hadid", "The Iron", 29, "MEDINA"],
  [58, "المجادلة", "Al-Mujadila", "The Pleading Woman", 22, "MEDINA"],
  [59, "الحشر", "Al-Hashr", "The Exile", 24, "MEDINA"],
  [60, "الممتحنة", "Al-Mumtahanah", "She That Is To Be Examined", 13, "MEDINA"],
  [61, "الصف", "As-Saff", "The Ranks", 14, "MEDINA"],
  [62, "الجمعة", "Al-Jumu'ah", "The Congregation, Friday", 11, "MEDINA"],
  [63, "المنافقون", "Al-Munafiqun", "The Hypocrites", 11, "MEDINA"],
  [64, "التغابن", "At-Taghabun", "The Mutual Disillusion", 18, "MEDINA"],
  [65, "الطلاق", "At-Talaq", "The Divorce", 12, "MEDINA"],
  [66, "التحريم", "At-Tahrim", "The Prohibition", 12, "MEDINA"],
  [67, "الملك", "Al-Mulk", "The Sovereignty", 30, "MECCA"],
  [68, "القلم", "Al-Qalam", "The Pen", 52, "MECCA"],
  [69, "الحاقة", "Al-Haqqah", "The Reality", 52, "MECCA"],
  [70, "المعارج", "Al-Ma'arij", "The Ascending Stairways", 44, "MECCA"],
  [71, "نوح", "Nuh", "Noah", 28, "MECCA"],
  [72, "الجن", "Al-Jinn", "The Jinn", 28, "MECCA"],
  [73, "المزمل", "Al-Muzzammil", "The Enshrouded One", 20, "MECCA"],
  [74, "المدثر", "Al-Muddaththir", "The Cloaked One", 56, "MECCA"],
  [75, "القيامة", "Al-Qiyamah", "The Resurrection", 40, "MECCA"],
  [76, "الانسان", "Al-Insan", "The Man", 31, "MEDINA"],
  [77, "المرسلات", "Al-Mursalat", "The Emissaries", 50, "MECCA"],
  [78, "النبأ", "An-Naba", "The Tidings", 40, "MECCA"],
  [79, "النازعات", "An-Nazi'at", "Those Who Drag Forth", 46, "MECCA"],
  [80, "عبس", "Abasa", "He Frowned", 42, "MECCA"],
  [81, "التكوير", "At-Takwir", "The Overthrowing", 29, "MECCA"],
  [82, "الإنفطار", "Al-Infitar", "The Cleaving", 19, "MECCA"],
  [83, "المطففين", "Al-Mutaffifin", "The Defrauding", 36, "MECCA"],
  [84, "الإنشقاق", "Al-Inshiqaq", "The Sundering", 25, "MECCA"],
  [85, "البروج", "Al-Buruj", "The Mansions of the Stars", 22, "MECCA"],
  [86, "الطارق", "At-Tariq", "The Morning Star", 17, "MECCA"],
  [87, "الأعلى", "Al-A'la", "The Most High", 19, "MECCA"],
  [88, "الغاشية", "Al-Ghashiyah", "The Overwhelming", 26, "MECCA"],
  [89, "الفجر", "Al-Fajr", "The Dawn", 30, "MECCA"],
  [90, "البلد", "Al-Balad", "The City", 20, "MECCA"],
  [91, "الشمس", "Ash-Shams", "The Sun", 15, "MECCA"],
  [92, "الليل", "Al-Layl", "The Night", 21, "MECCA"],
  [93, "الضحى", "Ad-Duhaa", "The Morning Hours", 11, "MECCA"],
  [94, "الشرح", "Ash-Sharh", "The Relief", 8, "MECCA"],
  [95, "التين", "At-Tin", "The Fig", 8, "MECCA"],
  [96, "العلق", "Al-Alaq", "The Clot", 19, "MECCA"],
  [97, "القدر", "Al-Qadr", "The Power", 5, "MECCA"],
  [98, "البينة", "Al-Bayyinah", "The Clear Proof", 8, "MEDINA"],
  [99, "الزلزلة", "Az-Zalzalah", "The Earthquake", 8, "MEDINA"],
  [100, "العاديات", "Al-Adiyat", "The Courser", 11, "MECCA"],
  [101, "القارعة", "Al-Qari'ah", "The Calamity", 11, "MECCA"],
  [102, "التكاثر", "At-Takathur", "The Rivalry in World Increase", 8, "MECCA"],
  [103, "العصر", "Al-Asr", "The Declining Day", 3, "MECCA"],
  [104, "الهمزة", "Al-Humazah", "The Traducer", 9, "MECCA"],
  [105, "الفيل", "Al-Fil", "The Elephant", 5, "MECCA"],
  [106, "قريش", "Quraysh", "Quraysh", 4, "MECCA"],
  [107, "الماعون", "Al-Ma'un", "The Small Kindnesses", 7, "MECCA"],
  [108, "الكوثر", "Al-Kawthar", "The Abundance", 3, "MECCA"],
  [109, "الكافرون", "Al-Kafirun", "The Disbelievers", 6, "MECCA"],
  [110, "النصر", "An-Nasr", "The Divine Support", 3, "MEDINA"],
  [111, "المسد", "Al-Masad", "The Palm Fiber", 5, "MECCA"],
  [112, "الإخلاص", "Al-Ikhlas", "The Sincerity", 4, "MECCA"],
  [113, "الفلق", "Al-Falaq", "The Daybreak", 5, "MECCA"],
  [114, "الناس", "An-Nas", "Mankind", 6, "MECCA"],
];

async function seedSoundLibrary() {
  console.log("Seeding sound library ...");

  for (let i = 0; i < GENRES.length; i++) {
    await pool.query(
      `INSERT INTO sound_genres (key, label, sort_order) VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order`,
      [GENRES[i].key, GENRES[i].label, i]
    );
  }

  for (let i = 0; i < MOODS.length; i++) {
    await pool.query(
      `INSERT INTO sound_moods (key, label, emoji, sort_order) VALUES ($1, $2, $3, $4)
       ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, emoji = EXCLUDED.emoji, sort_order = EXCLUDED.sort_order`,
      [MOODS[i].key, MOODS[i].label, MOODS[i].emoji, i]
    );
  }

  const artistIds: Record<string, string> = {};
  for (const a of ARTISTS) {
    const existing = await pool.query("SELECT id FROM sound_artists WHERE name = $1", [a.name]);
    if (existing.rowCount && existing.rowCount > 0) {
      artistIds[a.name] = existing.rows[0].id;
    } else {
      const { rows } = await pool.query(
        "INSERT INTO sound_artists (name, role) VALUES ($1, $2) RETURNING id",
        [a.name, a.role]
      );
      artistIds[a.name] = rows[0].id;
    }
  }

  const surahIds: Record<number, string> = {};
  for (const [number, ar, translit, en, ayatCount, place] of SURAHS) {
    const { rows } = await pool.query(
      `INSERT INTO quran_surahs (number, name_arabic, name_transliteration, name_english, ayat_count, revelation_place)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (number) DO UPDATE SET
         name_arabic = EXCLUDED.name_arabic, name_transliteration = EXCLUDED.name_transliteration,
         name_english = EXCLUDED.name_english, ayat_count = EXCLUDED.ayat_count, revelation_place = EXCLUDED.revelation_place
       RETURNING id`,
      [number, ar, translit, en, ayatCount, place]
    );
    surahIds[number] = rows[0].id;
  }
  console.log(`✅ Seeded genres, moods, artists, and all ${SURAHS.length} Surahs.`);

  const genreIdByKey: Record<string, string> = {};
  const { rows: genreRows } = await pool.query("SELECT id, key FROM sound_genres");
  for (const r of genreRows) genreIdByKey[r.key] = r.id;
  const moodIdByKey: Record<string, string> = {};
  const { rows: moodRows } = await pool.query("SELECT id, key FROM sound_moods");
  for (const r of moodRows) moodIdByKey[r.key] = r.id;

  type SeedSound = {
    title: string;
    subtitle?: string;
    category: "MUSIC" | "ISLAMIC";
    islamicSubcategory?: "QURAN" | "NAAT" | "HAMD" | "DUA" | "AZKAR" | "DUROOD" | "BAYAN";
    genre?: string;
    mood?: string;
    artist?: string;
    surahNumber?: number;
    ayatStart?: number;
    ayatEnd?: number;
    audioUrl: string;
    artworkSeed: string;
    durationSec: number;
    usageCount: number;
  };

  const SOUNDS: SeedSound[] = [
    // --- Music ---
    { title: "Golden Hour", subtitle: "Nova Ray", category: "MUSIC", genre: "pop", mood: "happy", artist: "Nova Ray", audioUrl: DEMO_TRACK(1), artworkSeed: "golden-hour", durationSec: 212, usageCount: 18400 },
    { title: "Late Night Drive", subtitle: "The Midnight Keys", category: "MUSIC", genre: "lofi", mood: "chill", artist: "The Midnight Keys", audioUrl: DEMO_TRACK(2), artworkSeed: "late-night-drive", durationSec: 196, usageCount: 9200 },
    { title: "Heartbeat", subtitle: "Lush Avenue", category: "MUSIC", genre: "pop", mood: "romantic", artist: "Lush Avenue", audioUrl: DEMO_TRACK(3), artworkSeed: "heartbeat", durationSec: 224, usageCount: 26700 },
    { title: "Rise Up", subtitle: "Echo & Wren", category: "MUSIC", genre: "edm", mood: "energetic", artist: "Echo & Wren", audioUrl: DEMO_TRACK(4), artworkSeed: "rise-up", durationSec: 201, usageCount: 41200 },
    { title: "Wildflower", subtitle: "Nova Ray", category: "MUSIC", genre: "acoustic", mood: "peaceful", artist: "Nova Ray", audioUrl: DEMO_TRACK(5), artworkSeed: "wildflower", durationSec: 188, usageCount: 5300 },
    { title: "City Lights", subtitle: "Lush Avenue", category: "MUSIC", genre: "hiphop", mood: "energetic", artist: "Lush Avenue", audioUrl: DEMO_TRACK(6), artworkSeed: "city-lights", durationSec: 205, usageCount: 15100 },
    { title: "Slow Fade", subtitle: "The Midnight Keys", category: "MUSIC", genre: "cinematic", mood: "sad", artist: "The Midnight Keys", audioUrl: DEMO_TRACK(7), artworkSeed: "slow-fade", durationSec: 233, usageCount: 3100 },
    { title: "Sunday Coffee", subtitle: "Echo & Wren", category: "MUSIC", genre: "chill", mood: "chill", artist: "Echo & Wren", audioUrl: DEMO_TRACK(8), artworkSeed: "sunday-coffee", durationSec: 214, usageCount: 7800 },
    // --- Quran Recitation (linked to real Surah metadata) ---
    { title: "Surah Al-Fatihah", category: "ISLAMIC", islamicSubcategory: "QURAN", surahNumber: 1, ayatStart: 1, ayatEnd: 7, artist: "Demo Reciter — Ahmad", audioUrl: DEMO_TRACK(9), artworkSeed: "quran-1", durationSec: 65, usageCount: 22100 },
    { title: "Surah Al-Ikhlas", category: "ISLAMIC", islamicSubcategory: "QURAN", surahNumber: 112, ayatStart: 1, ayatEnd: 4, artist: "Demo Reciter — Bilal", audioUrl: DEMO_TRACK(10), artworkSeed: "quran-112", durationSec: 40, usageCount: 31200 },
    { title: "Surah Ar-Rahman (excerpt)", category: "ISLAMIC", islamicSubcategory: "QURAN", surahNumber: 55, ayatStart: 1, ayatEnd: 13, artist: "Demo Reciter — Ahmad", audioUrl: DEMO_TRACK(11), artworkSeed: "quran-55", durationSec: 120, usageCount: 14300 },
    { title: "Surah Al-Kahf (opening)", category: "ISLAMIC", islamicSubcategory: "QURAN", surahNumber: 18, ayatStart: 1, ayatEnd: 10, artist: "Demo Reciter — Bilal", audioUrl: DEMO_TRACK(12), artworkSeed: "quran-18", durationSec: 150, usageCount: 8700 },
    { title: "Surah Yasin (opening)", category: "ISLAMIC", islamicSubcategory: "QURAN", surahNumber: 36, ayatStart: 1, ayatEnd: 12, artist: "Demo Reciter — Ahmad", audioUrl: DEMO_TRACK(13), artworkSeed: "quran-36", durationSec: 140, usageCount: 12500 },
    // --- Naat ---
    { title: "Ya Nabi Salam Alayka", subtitle: "Demo Naat Ensemble", category: "ISLAMIC", islamicSubcategory: "NAAT", artist: "Demo Naat Ensemble", audioUrl: DEMO_TRACK(14), artworkSeed: "naat-1", durationSec: 190, usageCount: 19800 },
    { title: "Tajdar-e-Haram (tribute)", subtitle: "Demo Naat Ensemble", category: "ISLAMIC", islamicSubcategory: "NAAT", artist: "Demo Naat Ensemble", audioUrl: DEMO_TRACK(15), artworkSeed: "naat-2", durationSec: 210, usageCount: 27600 },
    // --- Hamd ---
    { title: "Allah Hi Allah", subtitle: "Demo Naat Ensemble", category: "ISLAMIC", islamicSubcategory: "HAMD", artist: "Demo Naat Ensemble", audioUrl: DEMO_TRACK(16), artworkSeed: "hamd-1", durationSec: 175, usageCount: 9400 },
    // --- Dua ---
    { title: "Dua for Ease", subtitle: "Demo Reciter — Ahmad", category: "ISLAMIC", islamicSubcategory: "DUA", artist: "Demo Reciter — Ahmad", audioUrl: DEMO_TRACK(1), artworkSeed: "dua-1", durationSec: 60, usageCount: 6100 },
    { title: "Travel Dua", subtitle: "Demo Reciter — Bilal", category: "ISLAMIC", islamicSubcategory: "DUA", artist: "Demo Reciter — Bilal", audioUrl: DEMO_TRACK(2), artworkSeed: "dua-2", durationSec: 45, usageCount: 4200 },
    // --- Azkar ---
    { title: "Morning Azkar", subtitle: "Demo Reciter — Ahmad", category: "ISLAMIC", islamicSubcategory: "AZKAR", artist: "Demo Reciter — Ahmad", audioUrl: DEMO_TRACK(3), artworkSeed: "azkar-1", durationSec: 240, usageCount: 15600 },
    { title: "Evening Azkar", subtitle: "Demo Reciter — Bilal", category: "ISLAMIC", islamicSubcategory: "AZKAR", artist: "Demo Reciter — Bilal", audioUrl: DEMO_TRACK(4), artworkSeed: "azkar-2", durationSec: 230, usageCount: 11800 },
    // --- Durood ---
    { title: "Durood-e-Ibrahim", subtitle: "Demo Reciter — Ahmad", category: "ISLAMIC", islamicSubcategory: "DUROOD", artist: "Demo Reciter — Ahmad", audioUrl: DEMO_TRACK(5), artworkSeed: "durood-1", durationSec: 50, usageCount: 20300 },
    // --- Bayan / Nasihat ---
    { title: "Reminder: Patience", subtitle: "Demo Reciter — Bilal", category: "ISLAMIC", islamicSubcategory: "BAYAN", artist: "Demo Reciter — Bilal", audioUrl: DEMO_TRACK(6), artworkSeed: "bayan-1", durationSec: 300, usageCount: 5900 },
  ];

  for (const s of SOUNDS) {
    const existing = await pool.query("SELECT id FROM sounds WHERE title = $1", [s.title]);
    if (existing.rowCount && existing.rowCount > 0) continue;

    await pool.query(
      `INSERT INTO sounds
         (title, subtitle, category, islamic_subcategory, genre_id, mood_id, artist_id, surah_id,
          ayat_start, ayat_end, artwork_url, audio_url, duration_sec, allow_trim, min_trim_sec, max_trim_sec,
          usage_count, status, source, license_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,TRUE,5,60,$14,'ACTIVE','ROYALTY_FREE',$15)`,
      [
        s.title,
        s.subtitle ?? null,
        s.category,
        s.islamicSubcategory ?? null,
        s.genre ? genreIdByKey[s.genre] ?? null : null,
        s.mood ? moodIdByKey[s.mood] ?? null : null,
        s.artist ? artistIds[s.artist] ?? null : null,
        s.surahNumber ? surahIds[s.surahNumber] ?? null : null,
        s.ayatStart ?? null,
        s.ayatEnd ?? null,
        DEMO_ARTWORK(s.artworkSeed),
        s.audioUrl,
        s.durationSec,
        s.usageCount,
        PLACEHOLDER_NOTE,
      ]
    );
  }
  console.log(`✅ Seeded ${SOUNDS.length} sounds (Music + Islamic).`);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
