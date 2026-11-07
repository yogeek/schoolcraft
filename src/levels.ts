// Level progression shared by the activities.
// A session passed with ≥ 80 % of answers right on the first try opens the next level.
import { COUNT_LEVELS } from './content/counting';
import { READING_LEVELS } from './content/reading';
import { save, state, type ActivityId } from './state';

export const PASS_RATIO = 0.8;

export const MAX_LEVEL: Record<ActivityId, number> = {
  sounds: READING_LEVELS.length,
  count: COUNT_LEVELS.length,
};

export const LEVEL_NAMES: Record<ActivityId, string[]> = {
  sounds: READING_LEVELS.map((l) => l.name),
  count: COUNT_LEVELS.map((l) => l.name),
};

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

export interface SessionResult {
  firstTry: number;
  rounds: number;
  passed: boolean;
  /** the level the child moves to, when they passed and a next level exists */
  next: number | null;
  /** true when `next` was never reached before */
  isNew: boolean;
}

export function endSession(a: ActivityId, firstTry: number, rounds: number): SessionResult {
  const l = clamped(a);
  const passed = firstTry / rounds >= PASS_RATIO;
  let next: number | null = null;
  let isNew = false;
  if (passed && l.current < MAX_LEVEL[a]) {
    next = l.current + 1;
    isNew = next > l.unlocked;
    l.unlocked = Math.max(l.unlocked, next);
    l.current = next;
    save();
  }
  return { firstTry, rounds, passed, next, isNew };
}
