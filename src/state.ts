// Game state, saved on the device only (localStorage). No account, no server.

export const BLOCK_TYPES = ['grass', 'dirt', 'wood', 'stone', 'glass', 'gold'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const WORLD_COLS = 8;
export const WORLD_ROWS = 7;

/** Leitner box per item: 1 = à revoir souvent, 3 = maîtrisé. */
export interface ItemStat {
  box: 1 | 2 | 3;
  ok: number;
  ko: number;
}

export type ActivityId = 'sounds' | 'count';

export interface LevelState {
  /** level being played */
  current: number;
  /** highest level reached */
  unlocked: number;
}

export interface GameState {
  version: 1;
  levels: Record<ActivityId, LevelState>;
  inventory: Record<BlockType, number>;
  /** world[row][col], row 0 = top. null = air. */
  world: (BlockType | null)[][];
  stats: Record<string, ItemStat>;
}

const KEY = 'schoolcraft:v1';

function emptyWorld(): (BlockType | null)[][] {
  const w: (BlockType | null)[][] = [];
  for (let r = 0; r < WORLD_ROWS; r++) {
    w.push(Array.from({ length: WORLD_COLS }, () => (r === WORLD_ROWS - 1 ? 'grass' : null)));
  }
  return w;
}

function fresh(): GameState {
  return {
    version: 1,
    levels: { sounds: { current: 1, unlocked: 1 }, count: { current: 1, unlocked: 1 } },
    inventory: { grass: 2, dirt: 0, wood: 2, stone: 0, glass: 0, gold: 0 },
    world: emptyWorld(),
    stats: {},
  };
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as GameState;
    if (s.version !== 1 || !s.inventory || !Array.isArray(s.world)) return fresh();
    // tolerate new block types added later
    for (const t of BLOCK_TYPES) s.inventory[t] ??= 0;
    s.levels ??= { sounds: { current: 1, unlocked: 1 }, count: { current: 1, unlocked: 1 } };
    return s;
  } catch {
    return fresh();
  }
}

export const state: GameState = load();

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / storage full: the game still works for this session */
  }
}

export function totalBlocks(): number {
  return BLOCK_TYPES.reduce((n, t) => n + state.inventory[t], 0);
}

export function stat(id: string): ItemStat {
  return (state.stats[id] ??= { box: 1, ok: 0, ko: 0 });
}

/** Success moves the item up a box, a mistake sends it back to box 1. */
export function record(id: string, success: boolean): void {
  const s = stat(id);
  if (success) {
    s.ok++;
    s.box = Math.min(3, s.box + 1) as ItemStat['box'];
  } else {
    s.ko++;
    s.box = 1;
  }
  save();
}

/** Pick an item, favouring the ones in low boxes (seen less / missed). */
export function pickWeighted<T extends string>(items: readonly T[], avoid?: T): T {
  const weights = items.map((i) => (i === avoid ? 0 : [0, 6, 3, 1][stat(i).box]));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < items.length; k++) {
    r -= weights[k];
    if (r <= 0) return items[k];
  }
  return items[items.length - 1];
}

export function resetAll(): void {
  Object.assign(state, fresh());
  save();
}
