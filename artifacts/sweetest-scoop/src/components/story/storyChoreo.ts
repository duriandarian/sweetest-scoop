/* Pure, DOM-free choreography for the full-screen mango sago drink.
   Camera scale stays constant; the view drifts steadily down through suspended mango, sago and coconut. */
import { CHAPTER, END, INTRO, memories, TOTAL } from './storyData';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (x: number) => { const t = clamp(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const seeded = (n: number) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const chapterStart = (c: number) => INTRO + c * CHAPTER;

/* ---------- camera: constant zoom, fixed x, continuous downward translation ---------- */
export type Cam = { x: number; y: number; z: number; fy: number };
export const CAM_FY = 0.36;
export const V = 78;
const DECEL = 15;
const LIN_END = TOTAL - DECEL;
export function cameraY(t: number) {
  const tau = clamp(t, 0, TOTAL);
  if (tau < LIN_END) return V * tau;
  const d = tau - LIN_END;
  return V * (LIN_END + d - (d * d) / (2 * DECEL));
}
export const zoomFor = (w: number, h: number) => clamp(Math.min((h * 0.26) / PHOTO_BOX_H, (w * 0.5) / PHOTO_BOX_W), 0.45, 1.5);
export function cameraAt(t: number, w: number, h: number): Cam { return { x: 0, y: cameraY(t), z: zoomFor(w, h), fy: CAM_FY }; }

/* ---------- photos ---------- */
export const PHOTO_S = 1.1;
export const PHOTO_BOX_W = 132 * PHOTO_S;
export const PHOTO_BOX_H = 165 * PHOTO_S;
export const keyTime = (c: number) => chapterStart(c) + CHAPTER * 0.55;
/** the gentle current Bobi and the photos follow */
export const driftX = (y: number) => 34 * Math.sin(y / 260 + 0.6);
export const photoPos = (c: number) => { const y = cameraY(keyTime(c)); return { x: driftX(y), y, s: PHOTO_S }; };
/** each photo floats up into view from below as the drift reaches it: 0 hidden, 1 settled */
export const photoReveal = (c: number, t: number) => smooth((t - (keyTime(c) - 0.2)) / 0.2);
/** clear lane around photos so food never covers a memory */
export const nearPhoto = (x: number, y: number, pad = 0) => memories.some((_, c) => { const p = photoPos(c); return Math.abs(x - p.x) < PHOTO_BOX_W / 2 + 26 + pad && Math.abs(y - p.y) < PHOTO_BOX_H / 2 + 26 + pad; });

/* ---------- Bobi: screen-space companion beside the photo lane ---------- */
export type BobiPose = { x: number; y: number; size: number };
/** Bobi keeps one fixed row (beside photo centers), follows the gentle current sideways, never overlaps the photo column. */
export function bobiPose(t: number, w: number, h: number): BobiPose {
  const z = zoomFor(w, h);
  const size = clamp(w * 0.13, 56, 112);
  const camY = cameraY(t);
  const photoRight = w / 2 + (driftX(camY) + PHOTO_BOX_W / 2) * z;
  const x = Math.min(photoRight + 8, w - size - 6);
  // sit low beside the photo so the speech bubble below clears the photo's bottom edge
  const photoBottom = h * CAM_FY + (PHOTO_BOX_H / 2) * z;
  return { x, y: photoBottom - size, size };
}
export const BUBBLE_H = 64;
/** speech bubble attached below Bobi, offsets relative to Bobi's box, clamped inside the viewport */
export function bubblePose(p: BobiPose, w: number) {
  const bw = Math.min(230, w - 24);
  const left = clamp(p.x + p.size - bw, 12, w - 12 - bw) - p.x;
  return { left, top: p.size + 36, w: bw, h: BUBBLE_H, tail: clamp(p.size / 2 - left, 18, bw - 18) };
}
/** 0..1 how far through the drink we are */
export const depthProgress = (t: number) => clamp(cameraY(t) / cameraY(TOTAL));

/* ---------- the drink ---------- */
export const WORLD_X = 2200;
export const SURFACE_Y = -170;
export const WORLD_TOP = -900;
export const WORLD_BOTTOM = cameraY(TOTAL) + 1100;

export type Sago = { x: number; y: number; r: number; d: number };
export type Mango = { x: number; y: number; s: number; a: number; d: number };
export type Ribbon = { d: string; w: number; o: number; dur: number };

function scatter<T extends { x: number; y: number }>(n: number, seed: number, minGap: number, make: (x: number, y: number, i: number) => T, xr = 900): T[] {
  const out: T[] = [];
  for (let i = 0; out.length < n && i < n * 12; i++) {
    const x = lerp(-xr, xr, seeded(i * 2.31 + seed));
    const y = lerp(SURFACE_Y + 40, WORLD_BOTTOM, seeded(i * 4.17 + seed * 3));
    if (nearPhoto(x, y) || out.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < minGap * minGap)) continue;
    out.push(make(x, y, i));
  }
  return out;
}
export const sago: Sago[] = scatter(380, 1, 28, (x, y, i) => ({ x, y, r: 6 + seeded(i * 7.7) * 5, d: seeded(i * 1.9) * 6 }), 650);
export const mangoes: Mango[] = scatter(80, 17, 90, (x, y, i) => ({ x, y, s: 22 + seeded(i * 5.3) * 14, a: seeded(i * 3.3) * 90 - 45, d: seeded(i * 2.2) * 7 }), 650);
export const ribbons: Ribbon[] = (() => {
  const out: Ribbon[] = [];
  for (let i = 0, y = SURFACE_Y + 90; y < WORLD_BOTTOM; i++, y += 170 + seeded(i) * 150) {
    const amp = 22 + seeded(i * 3) * 34; const f = 150 + seeded(i * 5) * 140; const x0 = -1400;
    let d = `M${x0} ${y.toFixed(0)}`;
    for (let x = x0; x < 1400; x += 140) d += ` Q${x + 70} ${(y + amp * Math.sin(x / f + i)).toFixed(1)} ${x + 140} ${(y + amp * 0.5 * Math.cos((x + 140) / (f * 0.7) + i * 2)).toFixed(1)}`;
    out.push({ d, w: 10 + seeded(i * 11) * 26, o: 0.22 + seeded(i * 13) * 0.22, dur: 9 + seeded(i * 17) * 8 });
  }
  return out;
})();

/* ---------- UI (question card never moves; only its contents change) ---------- */
export type Ui = { chapter: number; typed: number; meter: boolean; done: boolean; intro: boolean };
export function uiAt(t: number): Ui {
  if (t >= END) return { chapter: 3, typed: 999, meter: true, done: true, intro: false };
  const c = clamp(Math.floor((t - INTRO) / CHAPTER), 0, 3);
  const local = t - chapterStart(c);
  const len = memories[c].answer.length;
  const typed = t < INTRO ? 0 : Math.floor(clamp((local - 0.3) / 2.1) * len);
  return { chapter: c, typed, meter: t >= keyTime(c) && t >= INTRO, done: false, intro: t < INTRO };
}
