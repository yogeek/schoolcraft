export type ScreenName = 'home' | 'sounds' | 'count' | 'build' | 'parents' | 'heroes' | 'color';

export interface Ctx {
  go(name: ScreenName): void;
  root: HTMLElement;
}
