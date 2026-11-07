export type ScreenName = 'home' | 'sounds' | 'count' | 'build';

export interface Ctx {
  go(name: ScreenName): void;
  root: HTMLElement;
}
