const base = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(/\/$/, '');

export type StoryMemory = {
  src: string;
  alt: string;
  answer: string;
  tier: StoryTier;
  /** only the first two dates are known; later photos never get invented dates */
  date: string;
  rarity: string;
  comment: string;
};

/** mango sago drink themed story preview labels, one per photo; illustration only, never real multiplayer scoring */
export const STORY_TIERS = ['Mango Milk', 'Sago Pearl', 'Coconut Swirl', 'Sweetheart Sip'] as const;
export type StoryTier = (typeof STORY_TIERS)[number];
export const storyQuestion = 'What makes a perfect date?';

// seconds
export const INTRO = 3.4; // short "Meet Bobi" intro; the drift is already moving underneath
export const CHAPTER = 7.6;
export const END = INTRO + CHAPTER * 4;
export const OUTRO = 2.2; // settle at the deepest memory, without resetting the descent
export const TOTAL = END + OUTRO;

export const PHOTO_W = 132;
export const PHOTO_H = 165;

// Exact order, earliest to latest. Answers are illustrative examples, not real guest data.
export const memories: StoryMemory[] = [
  { src: `${base}/story/flowers.jpg`, alt: 'Daniel and Amy with red flowers', answer: 'Dinner', tier: 'Mango Milk', date: '1 month', rarity: 'A common answer. Lots of people say it, so we stay near the top.', comment: 'Hmm, dinner? A little common! One month in.' },
  { src: `${base}/story/hills.jpg`, alt: 'Daniel and Amy in the green hills', answer: 'Dessert and a sunset walk', tier: 'Sago Pearl', date: '3 months', rarity: 'A little less common. We sink past the pearls.', comment: 'Ooh, getting specific! Three months already.' },
  { src: `${base}/story/polaroid.jpg`, alt: 'A Polaroid of Daniel and Amy at a wedding', answer: 'Sharing mango sago at Meet Fresh', tier: 'Coconut Swirl', date: '9 months', rarity: 'An unusual answer. Fewer people would say it, so we go deeper.', comment: 'Whoa, love that answer! Nine months in!' },
  { src: `${base}/story/bean.jpg`, alt: 'Daniel and Amy with Bean', answer: 'Saving them the very last mango piece', tier: 'Sweetheart Sip', date: 'Our next chapter', rarity: 'An answer only you would give. All the way to the bottom.', comment: 'That is SO them! Our next chapter.' },
];
export const BOBI_INTRO_LINE = 'Hi, I am Bobi! Dive in with me?';
export const BOBI_FINAL_LINE = 'That is SO them! We made it. Ready to play?';

/** mango, pearl, coconut, matcha */
export const TIER_COLOR: Record<StoryTier, string> = { 'Mango Milk': '#e3962a', 'Sago Pearl': '#b98a3e', 'Coconut Swirl': '#8a9a5b', 'Sweetheart Sip': '#5f8a4c' };