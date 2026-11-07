// Play-time limit chosen by the parents. Only time with the app open and visible counts.
// A break of 30 minutes or more starts a new sitting (the counter goes back to zero).
import { save, state } from './state';

export const BREAK_MS = 30 * 60 * 1000;
const TICK_MS = 5000;

/** Add the time elapsed since the last tick (capped, so time spent closed or hidden is not counted). */
export function tickPlayClock(now = Date.now()): void {
  const p = state.play;
  if (!p.last || now - p.last >= BREAK_MS) p.ms = 0;
  else if (!document.hidden) p.ms += Math.min(Math.max(0, now - p.last), TICK_MS * 2);
  p.last = now;
  save();
}

export function overLimit(): boolean {
  const lim = state.settings.limitMin;
  return lim > 0 && state.play.ms >= lim * 60_000;
}

export function resetPlayClock(): void {
  state.play.ms = 0;
  state.play.last = Date.now();
  save();
}

/** Minutes played in the current sitting. */
export function playedMinutes(): number {
  return Math.floor(state.play.ms / 60_000);
}

export function startPlayClock(onTick: () => void): void {
  tickPlayClock();
  setInterval(() => {
    tickPlayClock();
    onTick();
  }, TICK_MS);
}
