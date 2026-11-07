// Game state, saved on the device only (localStorage). No account, no server.

export const BLOCK_TYPES = ['grass', 'dirt', 'wood', 'stone', 'glass', 'gold'] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/** Build mode: buildable cells. The ground under them is a decoration (it cannot be picked up). */
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
  version: 2;
  levels: Record<ActivityId, LevelState>;
  inventory: Record<BlockType, number>;
  /** world[row][col], row 0 = top. null = air. */
  world: (BlockType | null)[][];
  stats: Record<string, ItemStat>;
  /** heroes: colour zones already filled, per hero id; `done` = completed, in order */
  heroes: { filled: Record<string, string[]>; done: string[] };
  settings: {
    /** play-time limit in minutes, 0 = no limit */
    limitMin: number;
  };
  /** time played in the current sitting (resets after a long break) */
  play: { ms: number; last: number };
}

const KEY = 'schoolcraft:v1'; // storage key kept across versions; `version` inside drives migrations

function emptyWorld(): (BlockType | null)[][] {
  return Array.from({ length: WORLD_ROWS }, () => Array.from({ length: WORLD_COLS }, () => null));
}

function freshLevels(): Record<ActivityId, LevelState> {
  return { sounds: { current: 1, unlocked: 1 }, count: { current: 1, unlocked: 1 } };
}

function fresh(): GameState {
  return {
    version: 2,
    levels: freshLevels(),
    // a few blocks to start, so the child can try colouring and building right away
    inventory: { grass: 2, dirt: 0, wood: 2, stone: 0, glass: 0, gold: 0 },
    world: emptyWorld(),
    stats: {},
    heroes: { filled: {}, done: [] },
    settings: { limitMin: 0 },
    play: { ms: 0, last: 0 },
  };
}

const isBlock = (v: unknown): v is BlockType => typeof v === 'string' && (BLOCK_TYPES as readonly string[]).includes(v);
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** Repair anything missing or malformed, and upgrade old saves. Never throws. */
function sanitize(raw: unknown): GameState {
  const base = fresh();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<GameState> & { version?: number; world?: unknown };

  for (const t of BLOCK_TYPES) base.inventory[t] = count((s.inventory as Record<string, unknown> | undefined)?.[t]);

  // world
  let world = Array.isArray(s.world) ? (s.world as unknown[][]) : null;
  if ((s.version ?? 1) < 2 && world && world.length === WORLD_ROWS) {
    // v1: the bottom row was a free grass floor that could be picked up (free blocks!). The floor is now a
    // decoration: drop that grass, give back any other block placed there, and move the house down one row
    // so it still stands on the ground.
    const floor = Array.isArray(world[WORLD_ROWS - 1]) ? world[WORLD_ROWS - 1] : [];
    for (const b of floor) if (isBlock(b) && b !== 'grass') base.inventory[b]++;
    world = [Array.from({ length: WORLD_COLS }, () => null), ...world.slice(0, WORLD_ROWS - 1)];
  }
  if (world && world.length === WORLD_ROWS && world.every((r) => Array.isArray(r) && r.length === WORLD_COLS)) {
    base.world = world.map((r) => r.map((b) => (isBlock(b) ? b : null)));
  }

  // levels
  for (const a of ['sounds', 'count'] as const) {
    const l = (s.levels as Record<string, Partial<LevelState>> | undefined)?.[a];
    const unlocked = Math.max(1, count(l?.unlocked));
    base.levels[a] = { unlocked, current: Math.min(Math.max(1, count(l?.current)), unlocked) };
  }

  // stats: keep only well-formed, prefixed keys (v1 also stored unused keys like "3" or "a")
  if (s.stats && typeof s.stats === 'object') {
    for (const [k, v] of Object.entries(s.stats as Record<string, Partial<ItemStat>>)) {
      if (!k.includes(':') || !v || typeof v !== 'object') continue;
      const box = v.box === 2 || v.box === 3 ? v.box : 1;
      base.stats[k] = { box, ok: count(v.ok), ko: count(v.ko) };
    }
  }

  // heroes
  const h = s.heroes as { filled?: Record<string, unknown>; done?: unknown } | undefined;
  if (h?.filled && typeof h.filled === 'object') {
    for (const [id, zones] of Object.entries(h.filled)) {
      if (Array.isArray(zones)) base.heroes.filled[id] = [...new Set(zones.filter((z): z is string => typeof z === 'string'))];
    }
  }
  if (Array.isArray(h?.done)) base.heroes.done = [...new Set(h.done.filter((d): d is string => typeof d === 'string'))];

  base.settings.limitMin = [0, 10, 15, 20, 30, 45].includes(count(s.settings?.limitMin)) ? count(s.settings?.limitMin) : 0;
  base.play = { ms: count(s.play?.ms), last: count(s.play?.last) };
  return base;
}

function load(): GameState {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : fresh();
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

/** Leitner box of an item, without creating an entry. */
export function boxOf(id: string): ItemStat['box'] {
  return state.stats[id]?.box ?? 1;
}

/** Success moves the item up a box, a mistake sends it back to box 1. */
export function record(id: string, success: boolean): void {
  const s = (state.stats[id] ??= { box: 1, ok: 0, ko: 0 });
  if (success) {
    s.ok++;
    s.box = Math.min(3, s.box + 1) as ItemStat['box'];
  } else {
    s.ko++;
    s.box = 1;
  }
  save();
}

/**
 * Pick an item, favouring the ones in low boxes (missed or rarely seen): spaced repetition.
 * `key` gives the stats id of an item; `avoid` is not picked (no same question twice in a row).
 */
export function pickWeighted<T>(items: readonly T[], key: (item: T) => string, avoid?: T): T {
  const weights = items.map((i) => (i === avoid && items.length > 1 ? 0 : [0, 6, 3, 1][boxOf(key(i))]));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let k = 0; k < items.length; k++) {
    r -= weights[k];
    if (r < 0) return items[k];
  }
  return items.filter((_, k) => weights[k] > 0).pop() ?? items[0];
}

/** Spend one block (the most plentiful kind first). Returns false when there is none left. */
export function spendBlock(): boolean {
  const t = [...BLOCK_TYPES].sort((a, b) => state.inventory[b] - state.inventory[a])[0];
  if (state.inventory[t] <= 0) return false;
  state.inventory[t]--;
  save();
  return true;
}

/** Erase everything except the parents' settings. */
export function resetAll(): void {
  const keep = state.settings;
  Object.assign(state, fresh(), { settings: keep });
  save();
}
