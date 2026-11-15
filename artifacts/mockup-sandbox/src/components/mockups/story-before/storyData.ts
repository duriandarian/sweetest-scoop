const base = '/__mockup';

export type StoryMemory = {
  src: string;
  alt: string;
  answer: string;
  matched: number;
  depth: number; // 0..1 position in the ice column
  side: 'left' | 'right';
  tilt: number;
};

export const STORY_GUESTS = 14;
export const STORY_DURATION = 32000;
export const STORY_INTRO = 2200;
export const STORY_CHAPTER = 7000;

export const storyQuestion = 'Say one sweet thing about Daniel + Amy.';

// Ordered earliest to latest. Answers are illustrative examples, not real guest data.
export const memories: StoryMemory[] = [
  { src: `${base}/story/flowers.jpg`, alt: 'Daniel and Amy with red flowers', answer: 'They look so happy together', matched: 11, depth: 0.2, side: 'right', tilt: 3 },
  { src: `${base}/story/hills.jpg`, alt: 'Daniel and Amy in the green hills', answer: 'They make every outing an adventure', matched: 6, depth: 0.42, side: 'left', tilt: -4 },
  { src: `${base}/story/polaroid.jpg`, alt: 'A Polaroid of Daniel and Amy at a wedding', answer: 'The way they light up a room', matched: 3, depth: 0.64, side: 'right', tilt: 2 },
  { src: `${base}/story/bean.jpg`, alt: 'Daniel and Amy with Bean', answer: 'Something only you would know', matched: 1, depth: 0.86, side: 'left', tilt: -2 },
];
