// Level progression shared by the activities.
// A session passed with ≥ 80 % of answers right on the first try opens the next level.
import { COUNT_CHAPTERS, COUNT_LEVELS } from './content/counting';
import { READING_CHAPTERS, READING_LEVELS } from './content/reading';
import { WRITING_CHAPTERS, WRITING_LEVELS } from './content/writing';
import { save, state, type ActivityId, type Grade } from './state';

export const PASS_RATIO = 0.8;

interface LevelInfo {
  name: string;
  chapter: number;
}

const LEVELS: Record<ActivityId, LevelInfo[]> = {
  sounds: READING_LEVELS,
  write: WRITING_LEVELS,
  count: COUNT_LEVELS,
};

export const CHAPTERS: Record<ActivityId, string[]> = {
  sounds: READING_CHAPTERS,
  write: WRITING_CHAPTERS,
  count: COUNT_CHAPTERS,
};

export const ACTIVITY_NAMES: Record<ActivityId, string> = { sounds: 'Lire', write: 'Écrire', count: 'Compter' };

export const MAX_LEVEL: Record<ActivityId, number> = {
  sounds: READING_LEVELS.length,
  write: WRITING_LEVELS.length,
  count: COUNT_LEVELS.length,
};

export const LEVEL_NAMES: Record<ActivityId, string[]> = {
  sounds: READING_LEVELS.map((l) => l.name),
  write: WRITING_LEVELS.map((l) => l.name),
  count: COUNT_LEVELS.map((l) => l.name),
};

/** Chapter (map section) of a level, 0-based. */
export function chapterOf(a: ActivityId, n: number): number {
  return LEVELS[a][n - 1]?.chapter ?? 0;
}

/** Keep stored levels inside the levels that exist (content can change between versions). */
function clamped(a: ActivityId) {
  const l = state.levels[a];
  const max = MAX_LEVEL[a];
  l.unlocked = Math.min(Math.max(1, l.unlocked), max);
  l.current = Math.min(Math.max(1, l.current), l.unlocked);
  return l;
}

export function currentLevel(a: ActivityId): number {
  return clamped(a).current;
}

export function unlockedLevel(a: ActivityId): number {
  return clamped(a).unlocked;
}

/** All the stars won so far, over the three activities (they wake the heroes up). */
export function totalStars(): number {
  let n = 0;
  for (const a of ['sounds', 'write', 'count'] as const) for (const v of state.stars[a]) n += v ?? 0;
  return n;
}

export function starsOf(a: ActivityId, n: number): number {
  return state.stars[a][n - 1] ?? 0;
}

/** Child picks a level already reached. */
export function setLevel(a: ActivityId, n: number): void {
  const l = clamped(a);
  l.current = Math.max(1, Math.min(n, l.unlocked));
  save();
}

/** Parents: jump straight to any level (unlocks it and every level below). */
export function parentSetLevel(a: ActivityId, n: number): void {
  const l = clamped(a);
  l.current = Math.max(1, Math.min(n, MAX_LEVEL[a]));
  l.unlocked = Math.max(l.unlocked, l.current);
  save();
}

/** Where a child of each class starts (the levels below stay open, to review). */
export const GRADE_START: Record<Grade, Record<ActivityId, number>> = {
  MS: { sounds: 1, write: 1, count: 1 },
  GS: { sounds: 4, write: 4, count: 5 },
  CP: { sounds: 6, write: 6, count: 9 },
};

export const GRADE_NAMES: Record<Grade, string> = { MS: 'Moyenne section', GS: 'Grande section', CP: 'CP' };

/** Parents chose the class: move each activity forward to its starting level (never backwards). */
export function applyGrade(g: Grade): void {
  state.settings.grade = g;
  for (const a of Object.keys(GRADE_START[g]) as ActivityId[]) {
    const l = clamped(a);
    const start = Math.min(GRADE_START[g][a], MAX_LEVEL[a]);
    if (l.unlocked < start) {
      l.unlocked = start;
      l.current = start;
    }
  }
  save();
}

/** An earlier level to slip one review question from (one of the last four levels before). */
export function reviewLevel(n: number, accept: (level: number) => boolean): number | null {
  const options: number[] = [];
  for (let k = Math.max(1, n - 4); k < n; k++) if (accept(k)) options.push(k);
  return options.length ? options[Math.floor(Math.random() * options.length)] : null;
}

export interface SessionResult {
  firstTry: number;
  rounds: number;
  passed: boolean;
  /** stars won this time (0–3) */
  stars: number;
  /** the level the child moves to, when they passed and a next level exists */
  next: number | null;
  /** true when `next` was never reached before */
  isNew: boolean;
  /** this is the last level of the activity */
  last: boolean;
}

export function endSession(a: ActivityId, levelNo: number, firstTry: number, rounds: number): SessionResult {
  const l = clamped(a);
  const passed = firstTry / rounds >= PASS_RATIO;
  const stars = passed ? (firstTry === rounds ? 3 : 2) : firstTry * 2 >= rounds ? 1 : 0;
  state.stars[a][levelNo - 1] = Math.max(starsOf(a, levelNo), stars);
  let next: number | null = null;
  let isNew = false;
  if (passed && levelNo < MAX_LEVEL[a]) {
    next = levelNo + 1;
    isNew = next > l.unlocked;
    l.unlocked = Math.max(l.unlocked, next);
    l.current = next;
  }
  // fill holes (a level reached by the parents' choice has no stars yet): keep the array dense
  for (let i = 0; i < state.stars[a].length; i++) state.stars[a][i] ??= 0;
  save();
  return { firstTry, rounds, passed, stars, next, isNew, last: levelNo >= MAX_LEVEL[a] };
}
