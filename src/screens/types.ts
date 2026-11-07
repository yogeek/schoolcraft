export type ScreenName = 'home' | 'sounds' | 'count' | 'build' | 'parents';

export interface Ctx {
  go(name: ScreenName): void;
  root: HTMLElement;
}
