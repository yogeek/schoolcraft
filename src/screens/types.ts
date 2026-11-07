import type { ScreenScope } from '../nav';

export type ScreenName = 'home' | 'sounds' | 'count' | 'build' | 'parents' | 'heroes' | 'color' | 'pause';

export interface Ctx extends ScreenScope {
  go(name: ScreenName): void;
  root: HTMLElement;
}
