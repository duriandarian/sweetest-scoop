/* Pure choreography for the personal opening: a scrapbook collage of Daniel and Amy,
   Bobi out front on the rim of a mango sago cup, then a dive straight into the cup surface
   that hands off to the drink world (story time 0). No dates are attached to these photos. */
import { clamp, smooth, lerp } from './storyChoreo';

const base = ((import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/').replace(/\/$/, '');

export type CollagePhoto = { src: string; alt: string; rot: number };
export const collage: CollagePhoto[] = [
  { src: `${base}/story/collage-1.webp`, alt: 'Daniel and Amy cuddled up in a mirror selfie', rot: -7 },
  { src: `${base}/story/collage-2.webp`, alt: 'Daniel and Amy being playful in a sky selfie', rot: 4 },
  { src: `${base}/story/collage-3.webp`, alt: 'Daniel and Amy taking a selfie in the green hills', rot: -2 },
  { src: `${base}/story/collage-4.webp`, alt: 'Daniel and Amy out to dinner at a restaurant', rot: 5 },
  { src: `${base}/story/collage-5.webp`, alt: 'Daniel and Amy in an outdoor round mirror', rot: -5 },
];
export const OPENING_LINE = 'Hi, I am Bobi! These two are my favorite people. Dive into their story with me?';

// seconds of global time before story time 0
export const PHOTO_IN = 0.5;
export const PHOTO_STAGGER = 0.5;
export const BOBI_IN = 3.3;
export const DIVE_START = 7.4;
export const ZOOM_START = 8.0;
export const FADE_START = 9.3;
export const OPENING = 10.4;

export type Rect = { x: number; y: number; w: number; h: number; rot: number };
export type OpeningLayout = { photos: Rect[]; cup: Rect; bobi: { x: number; y: number; size: number }; bubble: { x: number; y: number; w: number } | null; mobile: boolean; surface: { x: number; y: number } };
export const TITLE_H = 74;
export const CONTROLS_H = 66;
/** watercolor cup art is 420x869; the mango surface between the rim sits ~152px down */
export const CUP_SRC = `${base}/story/watercolor-mango-sago.webp`;
export const CUP_RATIO = 420 / 869;
export const CUP_SURFACE = 152 / 869;

/** pixel layout of the collage, cup and Bobi for a viewport */
export function openingLayout(w: number, h: number): OpeningLayout {
  const mobile = w < 700;
  const cupH = mobile ? clamp(h * 0.25, 140, 220) : clamp(h * 0.34, 150, 290);
  const cupW = cupH * CUP_RATIO;
  const cupTop = h - CONTROLS_H - cupH;
  const cupX = w / 2;
  const photos: Rect[] = [];
  if (mobile) {
    const top = TITLE_H + 6; const band = cupTop - 96 - top; const gap = 14;
    const ph = Math.min((band - gap) / 2, ((w - 36) / 3) * (4 / 3)); const pw = ph * 0.75;
    const r1 = top + ph / 2, r2 = top + ph * 1.5 + gap;
    [[0.2, r1], [0.5, r1 + 8], [0.8, r1], [0.31, r2], [0.69, r2]].forEach(([fx, y], i) => photos.push({ x: w * fx, y, w: pw, h: ph, rot: collage[i].rot }));
  } else {
    const ph = clamp(Math.min(h * 0.3, w * 0.17 * (4 / 3)), 120, 280); const pw = ph * 0.75;
    const yTop = TITLE_H + 14 + ph / 2; const yLow = Math.min(cupTop + cupH * 0.35, h - CONTROLS_H - 8 - ph / 2);
    [[0.14, 1], [0.3, 0.35], [0.5, 0], [0.7, 0.35], [0.86, 1]].forEach(([fx, k], i) => photos.push({ x: w * fx, y: lerp(yTop, yLow, k), w: pw, h: ph, rot: collage[i].rot }));
  }
  const size = mobile ? clamp(w * 0.24, 76, 104) : clamp(h * 0.15, 86, 136);
  const bobi = { x: cupX - cupW / 2 - size * 0.62, y: cupTop - size * 0.62, size };
  const bubble = mobile ? { x: bobi.x + size * 0.92, y: cupTop - size * 0.62 - 40, w: Math.min(250, w - (bobi.x + size * 0.92) - 14) } : { x: cupX + cupW / 2 + 18, y: cupTop + cupH * 0.08, w: Math.min(250, w - (cupX + cupW / 2 + 18) - 24) };
  return { photos, cup: { x: cupX, y: cupTop + cupH / 2, w: cupW, h: cupH, rot: 0 }, bobi, bubble, mobile, surface: { x: cupX, y: cupTop + cupH * CUP_SURFACE } };
}

export type OpeningFrame = { photoIn: number[]; cupIn: number; bobiIn: number; talk: boolean; jump: number; zoom: number; cupFade: number; bloom: number; spread: number; fade: number; done: boolean };
/** global time g → opening animation state */
export function openingAt(g: number): OpeningFrame {
  const photoIn = collage.map((_, i) => smooth((g - PHOTO_IN - i * PHOTO_STAGGER) / 0.8));
  const zk = smooth((g - ZOOM_START) / (FADE_START + 0.5 - ZOOM_START));
  return {
    photoIn,
    cupIn: smooth((g - 0.2) / 1.1),
    bobiIn: smooth((g - BOBI_IN) / 0.7),
    talk: g >= BOBI_IN + 0.5 && g < DIVE_START,
    jump: clamp((g - DIVE_START) / (ZOOM_START + 0.5 - DIVE_START)),
    zoom: Math.exp(Math.log(3.4) * zk),
    // the painted cup dissolves into the drink well before it fills the view
    cupFade: 1 - smooth((g - ZOOM_START - 0.25) / 1.15),
    bloom: smooth((g - ZOOM_START) / 0.9) * (1 - smooth((g - FADE_START) / (OPENING - FADE_START))),
    spread: smooth((g - (ZOOM_START - 0.2)) / 1.6),
    fade: 1 - smooth((g - FADE_START) / (OPENING - FADE_START)),
    done: g >= OPENING,
  };
}
/** Bobi's hop from the rim into the cup surface: returns screen offset, scale and opacity */
export function bobiDive(L: OpeningLayout, jump: number) {
  const j = smooth(jump);
  const sx = L.bobi.x + L.bobi.size / 2, sy = L.bobi.y + L.bobi.size / 2;
  const x = lerp(sx, L.surface.x, j);
  const y = lerp(sy, L.surface.y + L.bobi.size * 0.1, j) - Math.sin(Math.PI * j) * L.bobi.size * 1.1;
  return { x: x - L.bobi.size / 2, y: y - L.bobi.size / 2, s: lerp(1, 0.35, smooth((jump - 0.45) / 0.55)), o: 1 - smooth((jump - 0.82) / 0.18), spin: j * 200 };
}
