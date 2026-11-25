import { memo } from 'react';

export type IngredientKind = 'sago' | 'cube' | 'pomelo' | 'cloud' | 'gold';
export const INGREDIENT_KINDS: IngredientKind[] = ['sago', 'cube', 'pomelo', 'cloud', 'gold'];

type Art = { pal: Record<string, string>; rows: string[] };
/* 12x12 soft-pixel maps. '.' is transparent. Original art, no faces. */
const ART: Record<IngredientKind, Art> = {
  sago: { pal: { a: '#c9a87c', b: '#f3e6cc', c: '#fbf4e4', w: '#fffbf0', d: '#dcc39c' }, rows: [
    '', '....aaaa', '..aabbbbaa', '.abbcccbbba', '.abcwwcbbba', '.abcwccbbbda', '.abbccbbbbda', '.abbbbbbbdda', '..abbbbbdda', '...aaddda', '....aaaa'] },
  cube: { pal: { a: '#b8701e', b: '#f6b93a', w: '#ffe59a', c: '#e89a28', d: '#d4801f' }, rows: [
    '', '..aaaaaaaa', '.awwwwwwwwba', '.awbbbbbbbca', '.awbbbbbbbca', '.awbbbbbbbca', '.abbbbbbbbca', '.abbbbbbbcca', '.abbbbbbbcca', '.acccccccdca', '..aaaaaaaaa'] },
  pomelo: { pal: { a: '#b9555a', b: '#f29a95', w: '#ffd2c8', c: '#e5787c', d: '#fbe3c4' }, rows: [
    '', '.....aa', '....abba', '...abwbba', '..abbwcbba', '..abwbbcbba', '.abbwcbbcba', '.abbbbcbbbba', 'abbcbbbwbcba', 'abwbbbbbbbba', '.adddddddda', '..aaaaaaaa'] },
  // Coconut cream with two soft peaks, sitting in a half-shell.
  cloud: { pal: { a: '#52724e', w: '#fffdf2', b: '#dbe8ce', s: '#f6e2be', h: '#795039', c: '#b78156' }, rows: [
    '', '....aa', '...awwa.aa', '..awwwaawwa', '.awwwwwwwwwa', 'awwwbwwwwbwa',
    'abwwbbbwwbba', '.ssssssssss', '.hcccccccch', '..hcccccch', '...hhhhhh'] },
  // A tilted whole mango with a leaf and a small glint; the cube stays square.
  gold: { pal: { g: '#476637', G: '#9bb760', a: '#8e491d', b: '#ffd050', w: '#ffefab', c: '#ef8b27', s: '#fff5cf' }, rows: [
    '.........ggg', '.s......gGGg', 'sss....gGgg', '.s...aaag', '....awwwbaa', '...awwwbbbca',
    '..awbwwbbbca', '.awbbbbbbcca', '.abbbbbbcca', '.abbbbccaa', '..acccaa', '...aaa'] },
};

const RECTS = Object.fromEntries(INGREDIENT_KINDS.map(k => {
  const { pal, rows } = ART[k];
  const out: { x: number; y: number; w: number; f: string }[] = [];
  rows.forEach((row, y) => {
    const r = row.padEnd(12, '.');
    let x = 0;
    while (x < 12) {
      const ch = r[x];
      let w = 1;
      while (x + w < 12 && r[x + w] === ch) w++;
      if (ch !== '.' && pal[ch]) out.push({ x, y, w, f: pal[ch] });
      x += w;
    }
  });
  return [k, out];
})) as Record<IngredientKind, { x: number; y: number; w: number; f: string }[]>;

export const kindForDepth = (d: number) => INGREDIENT_KINDS[Math.max(0, Math.min(4, d))];

/** Restrained soft-pixel ingredient sprite. Fills its parent box unless size is given. */
export const IngredientArt = memo(function IngredientArt({ kind, depth, size, className = '', label }: { kind?: IngredientKind; depth?: number; size?: number; className?: string; label?: string }) {
  const k = kind ?? kindForDepth(depth ?? 0);
  return <svg className={`ia ia-${k} ${className}`} data-art={k} viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
    {RECTS[k].map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={1} fill={r.f}/>)}
  </svg>;
});
