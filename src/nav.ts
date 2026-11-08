// Screen lifecycle. Every screen gets a token: when the child leaves (home button, end of a
// session…), the old screen's pending speech and timers must stop instead of talking over the new
// screen or navigating on their own.
import { say, stopSpeech, type SayOpts } from './audio';

let token = 0;

export interface ScreenScope {
  /** false as soon as another screen was shown */
  alive(): boolean;
  /** speak only while this screen is shown */
  say(text: string, opts?: SayOpts): Promise<void>;
  /** wait, then tell whether the screen is still shown */
  wait(ms: number): Promise<boolean>;
}

/** Start a new screen in `root`: stop the voice, close overlays, scroll to top, clear the page. */
export function beginScreen(root: HTMLElement): ScreenScope {
  const my = ++token;
  stopSpeech();
  document.querySelectorAll('.overlay').forEach((o) => o.remove());
  window.scrollTo(0, 0);
  root.replaceChildren();
  const alive = () => my === token;
  return {
    alive,
    say: (text, opts) => (alive() ? say(text, opts) : Promise.resolve()),
    wait: (ms) => new Promise((resolve) => setTimeout(() => resolve(alive()), ms)),
  };
}
