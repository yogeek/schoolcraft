// Pixel's building challenges in « Ma maison »: build a tower of a given number of blocks (making a
// collection of a given size), copy a pattern, or copy it and continue it (repeating patterns,
// « algorithmes » in the maternelle programme). The child builds with their own blocks, right in
// the house: the blocks stay there and can be taken back. Only blocks placed during the challenge
// count, so a tower already in the house does not solve it.
import { BLOCK_TYPES, state, WORLD_COLS, WORLD_ROWS, type BlockType } from './state';

export type Challenge =
  | { kind: 'tower'; n: number }
  /** `model` is shown; `goal` is what must be built (longer than the model when it continues it) */
  | { kind: 'pattern'; model: BlockType[]; goal: BlockType[] };

export const NUMBER_WORDS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit'];

type Plan = { kind: 'tower'; n: number } | { kind: 'copy'; unit: number[]; times: number } | { kind: 'continue'; unit: number[]; shown: number; times: number };

/** The order of the challenges, easier first; after the last one they come back in turn. */
const PLANS: Plan[] = [
  { kind: 'tower', n: 3 },
  { kind: 'tower', n: 4 },
  { kind: 'copy', unit: [0, 1], times: 2 },
  { kind: 'tower', n: 5 },
  { kind: 'continue', unit: [0, 1], shown: 2, times: 3 },
  { kind: 'tower', n: 6 },
  { kind: 'copy', unit: [0, 1, 1], times: 2 },
  { kind: 'tower', n: 7 },
  { kind: 'continue', unit: [0, 0, 1], shown: 1, times: 2 },
  { kind: 'copy', unit: [0, 1, 2], times: 2 },
];

/** Blocks the child owns, in the inventory or already in the house (a block can be taken back). */
function owned(): Record<BlockType, number> {
  const n = { ...state.inventory };
  for (const row of state.world) for (const t of row) if (t) n[t]++;
  return n;
}

function build(p: Plan): Challenge | null {
  const have = owned();
  const total = BLOCK_TYPES.reduce((n, t) => n + have[t], 0);
  if (p.kind === 'tower') return total >= p.n ? { kind: 'tower', n: p.n } : null;
  const kinds = Math.max(...p.unit) + 1;
  // the most plentiful types first
  const types = BLOCK_TYPES.filter((t) => have[t] > 0)
    .sort((a, b) => have[b] - have[a])
    .slice(0, kinds);
  if (types.length < kinds) return null;
  const goal = Array.from({ length: p.unit.length * p.times }, (_, i) => types[p.unit[i % p.unit.length]]);
  // enough blocks of each type
  for (const t of types) if (goal.filter((g) => g === t).length > have[t]) return null;
  const model = p.kind === 'copy' ? goal : goal.slice(0, p.unit.length * p.shown);
  return { kind: 'pattern', model, goal };
}

/** The next challenge for this child, or null when they do not have enough blocks for any. */
export function nextChallenge(): Challenge | null {
  const k = state.challenges;
  const planned = PLANS[k % PLANS.length];
  // not enough blocks for this one: an earlier, smaller one
  for (const p of [planned, ...PLANS.slice(0, k % PLANS.length).reverse()]) {
    const c = build(p);
    if (c) return c;
  }
  return null;
}

/** Length of the vertical run of blocks through (r, c). */
export function columnRun(r: number, c: number): { top: number; bottom: number } {
  let top = r;
  let bottom = r;
  while (top > 0 && state.world[top - 1][c]) top--;
  while (bottom < WORLD_ROWS - 1 && state.world[bottom + 1][c]) bottom++;
  return { top, bottom };
}

/** The challenge is built with at least one block placed since it started (`fresh`: "r,c" keys). */
export function solved(ch: Challenge, fresh: Set<string>): boolean {
  const w = state.world;
  if (ch.kind === 'tower') {
    for (let c = 0; c < WORLD_COLS; c++)
      for (let r = 0; r < WORLD_ROWS; r++) {
        if (!w[r][c] || (r > 0 && w[r - 1][c])) continue; // top of a column of blocks
        const { bottom } = columnRun(r, c);
        if (bottom - r + 1 !== ch.n) continue;
        for (let k = r; k <= bottom; k++) if (fresh.has(`${k},${c}`)) return true;
      }
    return false;
  }
  const L = ch.goal.length;
  for (let r = 0; r < WORLD_ROWS; r++)
    for (let c = 0; c + L <= WORLD_COLS; c++) {
      // exactly the goal: no block glued on either side
      if ((c > 0 && w[r][c - 1]) || (c + L < WORLD_COLS && w[r][c + L])) continue;
      if (!ch.goal.every((t, i) => w[r][c + i] === t)) continue;
      for (let i = 0; i < L; i++) if (fresh.has(`${r},${c + i}`)) return true;
    }
  return false;
}

/** The tallest tower holding a block placed since the challenge started (0 when there is none). */
export function freshTower(fresh: Set<string>): number {
  let best = 0;
  for (const key of fresh) {
    const [r, c] = key.split(',').map(Number);
    if (!state.world[r]?.[c]) continue;
    const { top, bottom } = columnRun(r, c);
    best = Math.max(best, bottom - top + 1);
  }
  return best;
}

/**
 * A finished but wrong pattern: a row of blocks, as long as the goal or longer, holding a block
 * placed since the challenge started. Returns what it is made of (to tell it once), or null.
 */
export function wrongPattern(ch: Challenge, fresh: Set<string>): string | null {
  if (ch.kind !== 'pattern') return null;
  const w = state.world;
  for (const key of fresh) {
    const [r, c] = key.split(',').map(Number);
    if (!w[r]?.[c]) continue;
    let left = c;
    let right = c;
    while (left > 0 && w[r][left - 1]) left--;
    while (right < WORLD_COLS - 1 && w[r][right + 1]) right++;
    if (right - left + 1 >= ch.goal.length) return `${r}:${left}:${w[r].slice(left, right + 1).join(',')}`;
  }
  return null;
}
