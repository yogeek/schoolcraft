export type ScreenName = 'home' | 'vowels' | 'count' | 'build';

export interface Ctx {
  go(name: ScreenName): void;
  root: HTMLElement;
}
