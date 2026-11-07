// Level progression shared by the activities.
// A session passed with ≥ 80 % of answers right on the first try opens the next level.
import { save, state, type ActivityId } from './state';

export const PASS_RATIO = 0.8;

export function currentLevel(a: ActivityId): number {
  return state.levels[a].current;
}

export function unlockedLevel(a: ActivityId): number {
  return state.levels[a].unlocked;
}

export function setLevel(a: ActivityId, n: number): void {
  const l = state.levels[a];
  l.current = Math.max(1, Math.min(n, l.unlocked));
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

export function endSession(a: ActivityId, firstTry: number, rounds: number, maxLevel: number): SessionResult {
  const l = state.levels[a];
  const passed = firstTry / rounds >= PASS_RATIO;
  let next: number | null = null;
  let isNew = false;
  if (passed && l.current < maxLevel) {
    next = l.current + 1;
    isNew = next > l.unlocked;
    l.unlocked = Math.max(l.unlocked, next);
    l.current = next;
    save();
  }
  return { firstTry, rounds, passed, next, isNew };
}

/** Parents: jump straight to a level (unlocks it and every level below). */
export function parentSetLevel(a: ActivityId, n: number): void {
  const l = state.levels[a];
  l.current = n;
  l.unlocked = Math.max(l.unlocked, n);
  save();
}
