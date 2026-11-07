import type { ScreenScope } from '../nav';
import type { ActivityId } from '../state';

export type ScreenName = 'home' | ActivityId | 'map' | 'build' | 'parents' | 'heroes' | 'color' | 'pause';

export interface Ctx extends ScreenScope {
  /** show a screen; `map` needs the activity whose map to show */
  go(name: ScreenName, activity?: ActivityId): void;
  root: HTMLElement;
}
