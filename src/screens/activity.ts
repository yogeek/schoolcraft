// The three learning activities share one screen: the session engine (src/game.ts) runs the game
// of the current level, with one review question from an earlier level.
import { COUNT_LEVELS } from '../content/counting';
import { READING_LEVELS } from '../content/reading';
import { WRITING_LEVELS } from '../content/writing';
import { runSession, type Game } from '../game';
import { countingGame } from '../games/counting';
import { readingGame } from '../games/reading';
import { writingGame } from '../games/trace';
import { currentLevel, reviewLevel } from '../levels';
import type { ActivityId } from '../state';
import type { Ctx } from './types';

function makeGame(a: ActivityId, n: number): Game {
  switch (a) {
    case 'sounds':
      return readingGame(READING_LEVELS[n - 1]);
    case 'write':
      return writingGame(WRITING_LEVELS[n - 1]);
    case 'count':
      return countingGame(COUNT_LEVELS[n - 1]);
  }
}

function introOf(a: ActivityId, n: number): string {
  return (a === 'sounds' ? READING_LEVELS : a === 'write' ? WRITING_LEVELS : COUNT_LEVELS)[n - 1].intro;
}

/** Levels a review question can come from (the race needs its whole board). */
function canReview(a: ActivityId, n: number): boolean {
  return a !== 'count' || COUNT_LEVELS[n - 1].mode !== 'race';
}

export function activityScreen(ctx: Ctx, a: ActivityId): void {
  const n = currentLevel(a);
  const r = reviewLevel(n, (k) => canReview(a, k));
  runSession(ctx, { activity: a, levelNo: n, intro: introOf(a, n), game: makeGame(a, n), review: r ? makeGame(a, r) : null });
}
