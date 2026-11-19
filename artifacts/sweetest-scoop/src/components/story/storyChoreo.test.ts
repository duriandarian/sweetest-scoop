import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bobiPose, bubblePose, cameraAt, cameraY, chapterStart, depthProgress, driftX, keyTime, mangoes, nearPhoto, PHOTO_BOX_H, PHOTO_BOX_W, photoPos, photoReveal, ribbons, sago, SURFACE_Y, uiAt, zoomFor } from './storyChoreo';
import { CHAPTER, END, INTRO, memories, STORY_TIERS, TIER_COLOR, TOTAL } from './storyData';

const SIZES: [number, number][] = [[1440, 900], [1280, 720], [1920, 1080], [390, 844], [360, 640], [768, 1024], [1024, 600]];
const DT = 1 / 120;
const times = () => { const out: number[] = []; for (let t = 0; t <= TOTAL + 1e-9; t += DT) out.push(+t.toFixed(5)); return out; };

test('opening shows the drink surface and the camera moves from frame zero', () => {
  assert.ok(INTRO >= 2.5 && INTRO <= 4.5, 'intro is a short readable beat');
  assert.ok(cameraY(0.001) > 0);
  for (const [w, h] of SIZES) { const cam = cameraAt(0, w, h); assert.ok(h * cam.fy + (SURFACE_Y - cam.y) * cam.z > 0, `surface hidden on ${w}x${h}`); }
});

test('camera: constant zoom, fixed x, only ever moves down, never stalls', () => {
  for (const [w, h] of SIZES) {
    const z0 = cameraAt(0, w, h).z; let prev = cameraAt(0, w, h);
    for (const t of times().slice(1)) {
      const c = cameraAt(t, w, h);
      assert.equal(c.x, 0); assert.equal(c.z, z0); assert.equal(c.fy, prev.fy);
      assert.ok(c.y >= prev.y - 1e-9, `camera rose at ${t}`); prev = c;
    }
  }
  let prevV = 0;
  for (let t = INTRO; t < TOTAL - DT; t += DT) {
    const v = (cameraY(t + DT) - cameraY(t)) / DT;
    if (t < END) assert.ok(v > 8, `descent stalled at ${t.toFixed(2)}`);
    if (t > INTRO + DT) assert.ok(Math.abs(v - prevV) < 2, `velocity jumped at ${t.toFixed(2)}`);
    prevV = v;
  }
});

test('Bobi: always on screen, beside (never over) photos, above the question card, continuous', () => {
  for (const [w, h] of SIZES) {
    const z = zoomFor(w, h); let prev = bobiPose(0, w, h);
    for (const t of times()) {
      const p = bobiPose(t, w, h);
      assert.ok(p.x >= 0 && p.x + p.size <= w && p.y >= 0, `Bobi off screen ${w}x${h} at ${t}`);
      assert.ok(p.y + p.size * 1.4 < h - 260 || p.y + p.size * 1.4 < h * 0.62, `Bobi near question card ${w}x${h}`);
      assert.equal(p.y, prev.y); assert.equal(p.size, prev.size);
      assert.ok(Math.abs(p.x - prev.x) < 2, `Bobi darted at ${t}`);
      const photoRight = w / 2 + (driftX(cameraY(t)) + PHOTO_BOX_W / 2) * z;
      if (w >= 700) assert.ok(p.x >= photoRight, `Bobi overlaps photo ${w}x${h}`);
      else assert.ok(p.x >= photoRight - 0.12 * p.size, `Bobi overlaps photo ${w}x${h}`);
      prev = p;
    }
  }
  assert.equal(depthProgress(0), 0); assert.equal(depthProgress(TOTAL), 1);
});

test('dates: the supplied month milestones progress to the next chapter', () => {
  assert.deepEqual(memories.map(m => m.date), ['1 month', '3 months', '9 months', 'Our next chapter']);
  memories.forEach((m, c) => { if (c > 0) assert.ok(m.rarity !== memories[c - 1].rarity); });
});

test('Bobi speaks in an attached bubble with short lines at each memory', () => {
  assert.equal(new Set(memories.map(m => m.comment)).size, 4);
  assert.match(memories[0].comment, /common.*One month/);
  assert.match(memories[1].comment, /specific.*Three months/);
  assert.match(memories[2].comment, /love that answer.*Nine months/);
  for (const m of memories) assert.ok(m.comment.length < 60);
  const ui = readFileSync(new URL('./StoryIntro.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(ui, /Bobi says|bobi-comment/);
  const bobiBlock = ui.slice(ui.indexOf('className={`scene-bobi '), ui.indexOf('scene-chapter'));
  assert.match(bobiBlock, /scene-bubble/); assert.match(bobiBlock, /<Bobi /);
  assert.equal((ui.match(/<Bobi /g) || []).length, 2, 'one scene mascot plus reduced-motion static');
  assert.match(ui, /Bobi:.*m\.comment/);
  const b = readFileSync(new URL('./Bobi.tsx', import.meta.url), 'utf8');
  assert.match(b, /story\/bobi-reference\.webp/); assert.doesNotMatch(b, /<svg/);
});

test('speech bubble stays in bounds, below the photo, above the question card', () => {
  for (const [w, h] of SIZES) for (const t of times().filter((_, i) => i % 12 === 0)) {
    const p = bobiPose(t, w, h); const b = bubblePose(p, w); const z = zoomFor(w, h);
    const L = p.x + b.left, T = p.y + b.top;
    assert.ok(L >= 0 && L + b.w <= w, `bubble clipped ${w}x${h}`);
    assert.ok(T >= h * 0.36 + PHOTO_BOX_H / 2 * z, `bubble over photo ${w}x${h}`);
    assert.ok(T + b.h <= h - 200, `bubble over card ${w}x${h}`);
    assert.ok(b.tail > 10 && b.tail < b.w - 10);
    memories.forEach((_, c) => {
      if (photoReveal(c, t) <= 0) return;
      const cam = cameraAt(t, w, h);
      const photo = photoPos(c);
      const bottom = h * cam.fy + (photo.y - cam.y + PHOTO_BOX_H / 2 + 8) * cam.z;
      const right = w / 2 + (photo.x + PHOTO_BOX_W / 2 + 8) * cam.z;
      const left = w / 2 + (photo.x - PHOTO_BOX_W / 2 - 8) * cam.z;
      const top = bottom - (PHOTO_BOX_H + 16) * cam.z;
      assert.ok(bottom <= T || top >= T + b.h || right <= L || left >= L + b.w, `bubble overlaps entering photo ${c} on ${w}x${h} at ${t}`);
    });
  }
});

test('photos in exact order, revealed within their chapter, never covered by food', () => {
  assert.deepEqual(memories.map(m => m.src.split('/').pop()), ['flowers.jpg', 'hills.jpg', 'polaroid.jpg', 'bean.jpg']);
  memories.forEach((_, c) => {
    const p = photoPos(c);
    if (c > 0) assert.ok(p.y > photoPos(c - 1).y + PHOTO_BOX_H, 'photos out of order / overlapping');
    if (c > 0) assert.equal(photoReveal(c, chapterStart(c) - 0.01), 0);
    assert.equal(photoReveal(c, keyTime(c)), 1, `photo ${c} not revealed at key frame`);
    assert.equal(uiAt(keyTime(c) - 0.25).meter, false, 'Bobi must not describe a photo before it appears');
    assert.equal(uiAt(keyTime(c)).meter, true, 'Bobi reacts when the photo is visible');
    assert.ok(keyTime(c) < chapterStart(c) + CHAPTER);
  });
  for (const p of [...sago, ...mangoes]) assert.ok(!nearPhoto(p.x, p.y), 'food covers a photo');
  assert.ok(sago.length > 100 && mangoes.length > 20 && ribbons.length > 10);
});

test('photos frame on every viewport at a readable size', () => {
  for (const [w, h] of SIZES) memories.forEach((_, c) => {
    const cam = cameraAt(keyTime(c), w, h);
    const px = PHOTO_BOX_H * cam.z;
    assert.ok(px > 0.15 * h && px < 0.36 * h, `photo ${px}px on ${w}x${h}`);
    assert.ok(PHOTO_BOX_W * cam.z < 0.6 * w);
    const sy = h * cam.fy + (photoPos(c).y - cam.y) * cam.z;
    assert.ok(sy > 0.1 * h && sy < 0.6 * h);
  });
});

test('mango sago preview tiers progress Mango Milk to Sweetheart Sip, one per photo', () => {
  assert.deepEqual(memories.map(m => m.tier), [...STORY_TIERS]);
  assert.deepEqual([...STORY_TIERS], ['Mango Milk', 'Sago Pearl', 'Coconut Swirl', 'Sweetheart Sip']);
  for (const tier of STORY_TIERS) assert.match(TIER_COLOR[tier], /^#[0-9a-f]{6}$/);
  const src = ['StoryIntro.tsx', 'MangoDrink.tsx', 'storyData.ts', 'storyChoreo.ts'].map(f => readFileSync(new URL('./' + f, import.meta.url), 'utf8')).join('');
  assert.doesNotMatch(src, /correct answer|better answer|\bwrong answer/i);
});

test('ui: short intro, then questions type automatically, ends on final card', () => {
  assert.equal(uiAt(0).intro, true); assert.equal(uiAt(0).typed, 0);
  assert.equal(uiAt(INTRO).intro, false);
  assert.equal(uiAt(0).done, false);
  let prev = uiAt(INTRO);
  for (let t = INTRO; t < END; t += DT) {
    const u = uiAt(t);
    if (u.chapter === prev.chapter) assert.ok(u.typed >= prev.typed);
    else assert.equal(u.chapter, prev.chapter + 1);
    prev = u;
  }
  assert.equal(uiAt(END).done, true);
  for (let c = 1; c < 4; c++) assert.ok(memories[c].answer.length > memories[c - 1].answer.length, 'answers grow more specific');
});

test('end frame keeps the deepest photo (Bean) framed on every viewport', () => {
  for (const [w, h] of SIZES) {
    const cam = cameraAt(TOTAL, w, h);
    const sy = h * cam.fy + (photoPos(3).y - cam.y) * cam.z;
    assert.ok(sy - (PHOTO_BOX_H / 2) * cam.z > 0 && sy < 0.6 * h, `bean off screen at end on ${w}x${h}: ${sy}`);
  }
});

test('photos remain fully visible at their key frames', () => {
  for (const [w, h] of SIZES) memories.forEach((_, c) => {
    const cam = cameraAt(keyTime(c), w, h);
    const p = photoPos(c);
    const sx = w / 2 + (p.x - cam.x) * cam.z, sy = h * cam.fy + (p.y - cam.y) * cam.z;
    for (const [fx, fy] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
      const x = sx + fx * PHOTO_BOX_W * cam.z, y = sy + fy * PHOTO_BOX_H * cam.z;
      assert.ok(x > 0 && x < w && y > 0 && y < h, `photo ${c} clipped on ${w}x${h}`);
    }
  });
});

test('liquid renderer: no bowl, excavation tunnel, holes, ice piles or flecks', () => {
  const src = ['StoryIntro.tsx', 'MangoDrink.tsx', 'storyChoreo.ts', 'story.css'].map(f => readFileSync(new URL('./' + f, import.meta.url), 'utf8')).join('');
  assert.doesNotMatch(src, /tunnel|scoopScale|pileScale|fleck|shaved|ice-tex|holes|scene-bowl|scene-rim|bowlGeom/i);
});

test('no straw, sipping or utensils; Bobi companion is wired in', () => {
  const files = ['MangoDrink.tsx', 'StoryIntro.tsx', 'storyChoreo.ts', 'story.css', 'Bobi.tsx'].map(f => readFileSync(new URL('./' + f, import.meta.url), 'utf8')).join('');
  assert.doesNotMatch(files, /straw|r\.sip|sipPhase|sipping|spoon|fork|whisk|to stir/i);
  const intro = readFileSync(new URL('./StoryIntro.tsx', import.meta.url), 'utf8');
  assert.match(intro, /Meet Bobi/); assert.match(intro, /Your little boba guide\./); assert.match(intro, /Rarer answers take us deeper\./);
  assert.match(intro, /Ready to <em>play\?/); assert.match(intro, /Scripted preview/);
});

import { bobiDive, collage, DIVE_START, OPENING, openingAt, openingLayout, TITLE_H, CONTROLS_H } from './storyOpening';
test('opening: five personal photos, long enough to enjoy, then a dive that ends exactly at drink time 0', () => {
  assert.equal(collage.length, 5);
  assert.deepEqual(collage.map(c => c.src.split('/').pop()), ['collage-1.webp', 'collage-2.webp', 'collage-3.webp', 'collage-4.webp', 'collage-5.webp']);
  assert.ok(OPENING >= 8 && OPENING <= 12, 'opening has time to appreciate the collage');
  const allIn = openingAt(DIVE_START - 0.01); assert.ok(allIn.photoIn.every(v => v === 1), 'all photos settled before the dive');
  assert.ok(DIVE_START - 3 >= 3, 'collage holds fully assembled for at least 3s');
  assert.equal(openingAt(0).fade, 1); assert.equal(openingAt(OPENING).fade, 0); assert.ok(openingAt(OPENING).done);
  let prev = openingAt(0);
  for (let g = DT; g <= OPENING; g += DT) { const f = openingAt(g); assert.ok(f.zoom >= prev.zoom && f.fade <= prev.fade + 1e-9 && f.zoom / prev.zoom < 1.035); prev = f; }
  const src = readFileSync(new URL('./storyOpening.ts', import.meta.url), 'utf8') + readFileSync(new URL('./OpeningCollage.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /month|date:|20\d\d/i, 'no invented dates on the new photos');
  assert.doesNotMatch(src, /straw|spoon/i);
  assert.match(src, /<Bobi /);
});
test('opening layout: every photo, Bobi and the cup fit on screen and clear the title and controls', () => {
  for (const [w, h] of SIZES) {
    const L = openingLayout(w, h);
    for (const p of L.photos) {
      const ex = p.w * 0.06 + 6;
      assert.ok(p.x - p.w / 2 - ex >= 0 && p.x + p.w / 2 + ex <= w, `photo off side ${w}x${h}`);
      assert.ok(p.y - p.h / 2 >= TITLE_H - 4 && p.y + p.h / 2 <= h - CONTROLS_H, `photo clips title/controls ${w}x${h}`);
      assert.ok(p.h >= 110, `photo too small ${w}x${h}`);
    }
    assert.ok(L.cup.y + L.cup.h / 2 <= h - CONTROLS_H + 1 && L.cup.h >= 140);
    assert.ok(L.bobi.x >= 0 && L.bobi.size >= 76 && L.bobi.y + L.bobi.size <= h - CONTROLS_H);
    if (L.bubble) assert.ok(L.bubble.x + L.bubble.w <= w && L.bubble.w >= 160, `bubble ${w}x${h}`);
    // the cup only scales up about its surface during the dive, so its base only ever moves down
    let prevBase = -Infinity;
    for (let g = 0; g <= OPENING; g += 0.05) { const f = openingAt(g); const base = L.surface.y + (L.cup.y + L.cup.h / 2 - L.surface.y) * f.zoom; if (g > 1.4) assert.ok(base >= prevBase - 1e-6, 'cup base rose'); prevBase = base; }
    const end = bobiDive(L, 1); assert.ok(Math.abs(end.x + L.bobi.size / 2 - L.surface.x) < 1, 'Bobi lands in the cup');
  }
});
