// Game state, saved on the device only (localStorage). No account, no server.

/** Blocks won by answering. The special ones only come from chests (the daily adventure). */
export const COMMON_BLOCKS = ['grass', 'dirt', 'wood', 'stone', 'glass'] as const;
export const SPECIAL_BLOCKS = ['brick', 'leaves', 'flower', 'crystal'] as const;
export const BLOCK_TYPES = [...COMMON_BLOCKS, 'gold', ...SPECIAL_BLOCKS] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];
export type SpecialBlock = (typeof SPECIAL_BLOCKS)[number];

/** Build mode: buildable cells. The ground under them is a decoration (it cannot be picked up). */
export const WORLD_COLS = 8;
export const WORLD_ROWS = 7;

/** Leitner box per item: 1 = à revoir souvent, 3 = maîtrisé. */
export interface ItemStat {
  box: 1 | 2 | 3;
  ok: number;
  ko: number;
}

export const ACTIVITIES = ['sounds', 'write', 'count'] as const;
export type ActivityId = (typeof ACTIVITIES)[number];

export type Grade = 'MS' | 'GS' | 'CP';

export interface LevelState {
  /** level being played */
  current: number;
  /** highest level reached */
  unlocked: number;
}

/** One day of play, for the parents' summary. */
export interface DayLog {
  ms: number;
  /** questions answered right */
  good: number;
}

export interface GameState {
  version: 4;
  levels: Record<ActivityId, LevelState>;
  /** best stars (0–3) per level, index = level − 1 */
  stars: Record<ActivityId, number[]>;
  inventory: Record<BlockType, number>;
  /** world[row][col], row 0 = top. null = air. */
  world: (BlockType | null)[][];
  stats: Record<string, ItemStat>;
  /** heroes: colour zones already filled, per hero id; `done` = completed, in order */
  heroes: { filled: Record<string, string[]>; done: string[] };
  /** daily adventure: one game of each activity; a chest when all three are done */
  mission: { day: string; done: ActivityId[]; chest: boolean };
  /** chests opened so far (one per completed adventure) */
  chests: number;
  /** Pixel's building challenges done in « Ma maison » (challenge.ts: the next one gets harder) */
  challenges: number;
  /** play per day (YYYY-MM-DD), last 60 days */
  history: Record<string, DayLog>;
  settings: {
    /** play-time limit in minutes, 0 = no limit */
    limitMin: number;
    /** class of the child, chosen by the parents (null = not asked yet) */
    grade: Grade | null;
  };
  /** time played in the current sitting (resets after a long break) */
  play: { ms: number; last: number };
}

// ---------------------------------------------------------------- children (profiles)
// Each child has a separate save. The first child keeps the original key, so saves made before
// profiles existed are the first child's. Switching child reloads the app on the other save.
export interface Profile {
  id: string;
  /** typed by the parents (stays on the device) */
  name: string;
  /** index of the hero used as avatar */
  avatar: number;
}

const PROFILES_KEY = 'schoolcraft:profiles';
export const MAX_PROFILES = 4;

function loadProfiles(): { current: string; list: Profile[] } {
  const first: Profile = { id: 'p1', name: '', avatar: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILES_KEY) ?? 'null') as { current?: unknown; list?: unknown } | null;
    const list = Array.isArray(raw?.list)
      ? (raw.list as Partial<Profile>[])
          .filter((p) => typeof p?.id === 'string' && /^p\d+$/.test(p.id))
          .slice(0, MAX_PROFILES)
          .map((p) => ({ id: p.id!, name: typeof p.name === 'string' ? p.name.slice(0, 20) : '', avatar: typeof p.avatar === 'number' ? Math.max(0, Math.floor(p.avatar)) : 0 }))
      : [];
    if (!list.some((p) => p.id === 'p1')) list.unshift(first);
    const current = list.find((p) => p.id === raw?.current)?.id ?? 'p1';
    return { current, list };
  } catch {
    return { current: 'p1', list: [first] };
  }
}

export const profiles = loadProfiles();

const keyOf = (id: string) => (id === 'p1' ? 'schoolcraft:v1' : `schoolcraft:v1:${id}`);
/** storage key of the child playing; kept across versions, `version` inside drives migrations */
const KEY = keyOf(profiles.current);

export function saveProfiles(): void {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  } catch {
    /* storage full */
  }
}

export function currentProfile(): Profile {
  return profiles.list.find((p) => p.id === profiles.current) ?? profiles.list[0];
}

export function profileName(p: Profile): string {
  return p.name.trim() || `Enfant ${profiles.list.indexOf(p) + 1}`;
}

/** Play as another child: the app restarts on that child's save. */
export function switchProfile(id: string): void {
  if (id === profiles.current || !profiles.list.some((p) => p.id === id)) return;
  save();
  profiles.current = id;
  saveProfiles();
  location.reload();
}

export function addProfile(): Profile | null {
  if (profiles.list.length >= MAX_PROFILES) return null;
  let n = 2;
  while (profiles.list.some((p) => p.id === `p${n}`)) n++;
  const used = new Set(profiles.list.map((p) => p.avatar));
  let avatar = 0;
  while (used.has(avatar)) avatar++;
  const p: Profile = { id: `p${n}`, name: '', avatar };
  profiles.list.push(p);
  saveProfiles();
  return p;
}

/** Remove a child and their save (never the child playing now). */
export function removeProfile(id: string): void {
  if (id === profiles.current) return;
  profiles.list = profiles.list.filter((p) => p.id !== id);
  try {
    localStorage.removeItem(keyOf(id));
  } catch {
    /* ignore */
  }
  saveProfiles();
}

/** Local date as YYYY-MM-DD. */
export function today(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function emptyWorld(): (BlockType | null)[][] {
  return Array.from({ length: WORLD_ROWS }, () => Array.from({ length: WORLD_COLS }, () => null));
}

function emptyInventory(): Record<BlockType, number> {
  return Object.fromEntries(BLOCK_TYPES.map((t) => [t, 0])) as Record<BlockType, number>;
}

function fresh(): GameState {
  const inventory = emptyInventory();
  // a few blocks to start, so the child can try colouring and building right away
  inventory.grass = 2;
  inventory.wood = 2;
  return {
    version: 4,
    levels: { sounds: { current: 1, unlocked: 1 }, write: { current: 1, unlocked: 1 }, count: { current: 1, unlocked: 1 } },
    stars: { sounds: [], write: [], count: [] },
    inventory,
    world: emptyWorld(),
    stats: {},
    heroes: { filled: {}, done: [] },
    mission: { day: '', done: [], chest: false },
    chests: 0,
    challenges: 0,
    history: {},
    settings: { limitMin: 0, grade: null },
    play: { ms: 0, last: 0 },
  };
}

const isBlock = (v: unknown): v is BlockType => typeof v === 'string' && (BLOCK_TYPES as readonly string[]).includes(v);
const isActivity = (v: unknown): v is ActivityId => typeof v === 'string' && (ACTIVITIES as readonly string[]).includes(v);
const count = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const isDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * v2 → v3: new levels were inserted (phonology before the letters, new counting games), so a level
 * number now means another level. Index = old level number, value = the same level in v3.
 */
const V3_LEVELS: Partial<Record<ActivityId, number[]>> = {
  sounds: [0, 4, 5, 6, 7, 8, 10, 11, 14, 15, 16, 12, 17],
  count: [0, 1, 2, 5, 4, 11, 13],
};

/**
 * v3 → v4: reading went from 19 to 31 levels (silent letters, c and g, other spellings of a sound,
 * consonant clusters, little words). Index = v3 level number, value = the same level in v4.
 */
const V4_READING = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 30, 31];

/** A level number of an older save, in today's numbering. */
function migrateLevel(a: ActivityId, n: number, version: number): number {
  const v3 = V3_LEVELS[a];
  if (version < 3 && v3) n = v3[Math.min(n, v3.length - 1)];
  if (version < 4 && a === 'sounds') n = V4_READING[Math.min(n, V4_READING.length - 1)];
  return n;
}

/** Repair anything missing or malformed, and upgrade old saves. Never throws. */
function sanitize(raw: unknown): GameState {
  const base = fresh();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Partial<GameState> & { version?: number; world?: unknown };
  const version = s.version ?? 1;

  for (const t of BLOCK_TYPES) base.inventory[t] = count((s.inventory as Record<string, unknown> | undefined)?.[t]);

  // world
  let world = Array.isArray(s.world) ? (s.world as unknown[][]) : null;
  if (version < 2 && world && world.length === WORLD_ROWS) {
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

  // levels (clamped to the levels that exist by levels.ts, which knows the content)
  for (const a of ACTIVITIES) {
    const l = (s.levels as Record<string, Partial<LevelState>> | undefined)?.[a];
    let unlocked = Math.max(1, count(l?.unlocked));
    let current = Math.min(Math.max(1, count(l?.current)), unlocked);
    if (version < 4 && l) {
      // every old level up to `unlocked` stays open in its new place
      const opened = Array.from({ length: unlocked }, (_, i) => migrateLevel(a, i + 1, version));
      current = migrateLevel(a, current, version);
      unlocked = Math.max(...opened);
    }
    base.levels[a] = { unlocked: Math.max(unlocked, current), current };
  }

  // stars
  for (const a of ACTIVITIES) {
    const st = (s.stars as Record<string, unknown> | undefined)?.[a];
    if (!Array.isArray(st)) continue;
    const stars = st.map((v) => Math.min(3, count(v)));
    if (version < 4 && a === 'sounds') {
      // stars came with v3: only the v3 → v4 renumbering applies
      const moved: number[] = [];
      stars.forEach((v, i) => (moved[V4_READING[Math.min(i + 1, V4_READING.length - 1)] - 1] = v));
      base.stars[a] = Array.from(moved, (v) => v ?? 0);
    } else base.stars[a] = stars;
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

  // daily adventure, chests, history
  const m = s.mission as Partial<GameState['mission']> | undefined;
  if (m && isDay(m.day)) {
    base.mission = { day: m.day, done: Array.isArray(m.done) ? [...new Set(m.done.filter(isActivity))] : [], chest: m.chest === true };
  }
  base.chests = count(s.chests);
  base.challenges = count(s.challenges); // added without a version bump: older saves simply have 0
  if (s.history && typeof s.history === 'object') {
    const days = Object.keys(s.history).filter(isDay).sort().slice(-60);
    for (const d of days) {
      const v = (s.history as Record<string, Partial<DayLog>>)[d];
      base.history[d] = { ms: count(v?.ms), good: count(v?.good) };
    }
  }

  base.settings.limitMin = [0, 10, 15, 20, 30, 45].includes(count(s.settings?.limitMin)) ? count(s.settings?.limitMin) : 0;
  const g = s.settings?.grade;
  base.settings.grade = g === 'MS' || g === 'GS' || g === 'CP' ? g : null;
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

// the app open in two tabs (or the installed app and a browser tab): take the other tab's save,
// so neither tab overwrites the other with old data
try {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      Object.assign(state, sanitize(JSON.parse(e.newValue)));
    } catch {
      /* unreadable: keep ours */
    }
  });
} catch {
  /* no window (content checks under Node) */
}

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

/** Today's adventure (reset when the day changed). */
export function mission(): GameState['mission'] {
  const d = today();
  if (state.mission.day !== d) {
    state.mission = { day: d, done: [], chest: false };
    save();
  }
  return state.mission;
}

/** Note a finished game: daily adventure and the parents' history. */
/** A right answer, in today's log for the parents' week (counted at once: a game left before its end counts too). */
export function logGood(): void {
  const day = (state.history[today()] ??= { ms: 0, good: 0 });
  day.good++;
}

/** A finished game: today's adventure moves on; old days are dropped from the log. */
/** A finished game, for the daily adventure; true when it is today's first one of this activity. */
export function logGame(a: ActivityId): boolean {
  const m = mission();
  const first = !m.done.includes(a);
  if (first) m.done.push(a);
  const days = Object.keys(state.history).sort();
  for (const old of days.slice(0, Math.max(0, days.length - 60))) delete state.history[old];
  save();
  return first;
}

/** Add play time to today's log (called by the play clock). */
export function logTime(ms: number): void {
  if (ms <= 0) return;
  const day = (state.history[today()] ??= { ms: 0, good: 0 });
  day.ms += ms;
}

/** Erase everything except the parents' settings. */
export function resetAll(): void {
  const keep = state.settings;
  Object.assign(state, fresh(), { settings: keep });
  save();
}
