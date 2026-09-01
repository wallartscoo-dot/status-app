export interface MoodCategory {
  key: string;
  emoji: string;
  label: string;
}

// Shown as horizontally-scrolling chips on the Home hero section.
export const MOOD_CATEGORIES: MoodCategory[] = [
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "attitude", emoji: "😎", label: "Attitude" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "funny", emoji: "😂", label: "Funny" },
  { key: "trending", emoji: "🔥", label: "Trending" },
  { key: "motivation", emoji: "💪", label: "Motivation" },
  { key: "islamic", emoji: "🕌", label: "Islamic" },
  { key: "birthday", emoji: "🎂", label: "Birthday" },
  { key: "broken", emoji: "💔", label: "Broken" },
  { key: "royal", emoji: "👑", label: "Royal" },
  { key: "aesthetic", emoji: "🌙", label: "Aesthetic" },
];

// Full category directory shown on the Explore/Categories screen.
export const ALL_CATEGORIES: MoodCategory[] = [
  { key: "love", emoji: "❤️", label: "Love" },
  { key: "romantic", emoji: "💞", label: "Romantic" },
  { key: "sad", emoji: "😢", label: "Sad" },
  { key: "breakup", emoji: "💔", label: "Breakup" },
  { key: "attitude", emoji: "😎", label: "Attitude" },
  { key: "motivation", emoji: "💪", label: "Motivation" },
  { key: "friendship", emoji: "🤝", label: "Friendship" },
  { key: "funny", emoji: "😂", label: "Funny" },
  { key: "islamic", emoji: "🕌", label: "Islamic" },
  { key: "birthday", emoji: "🎂", label: "Birthday" },
  { key: "good-morning", emoji: "🌅", label: "Good Morning" },
  { key: "good-night", emoji: "🌙", label: "Good Night" },
  { key: "poetry", emoji: "🖋️", label: "Poetry" },
  { key: "quotes", emoji: "💬", label: "Quotes" },
  { key: "aesthetic", emoji: "✨", label: "Aesthetic" },
  { key: "trending", emoji: "🔥", label: "Trending" },
  { key: "viral", emoji: "🚀", label: "Viral" },
  { key: "festival", emoji: "🎉", label: "Festival" },
  { key: "sports", emoji: "🏆", label: "Sports" },
  { key: "travel", emoji: "✈️", label: "Travel" },
];
