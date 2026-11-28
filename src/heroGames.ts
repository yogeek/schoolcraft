// Les petits jeux des amis : chaque ami réveillé peut avoir son jeu, ouvert par une clé du coffre du
// jour (le premier est offert). Ces jeux ne donnent pas de blocs (on ne rejoue pas pour « farmer ») :
// chacun a 3 paliers de plus en plus durs, et une médaille par palier réussi.
import { HEROES, type Hero } from './content/heroes';
import { save, state } from './state';

/** The heroes that have a game, in the order the games open. */
export const GAME_HEROES = ['kaze', 'flammeche', 'corail', 'bulle', 'tao', 'pousse', 'luna', 'orageon', 'robo', 'glacon', 'brume', 'astro'] as const;
export type GameHero = (typeof GAME_HEROES)[number];

export const MEDALS = 3;

export const isGameHero = (id: string): id is GameHero => (GAME_HEROES as readonly string[]).includes(id);
export const gameOpen = (id: string): boolean => isGameHero(id) && state.games.open.includes(id);
/** medals won in this hero's game (0–3) */
export const medalsOf = (id: string): number => state.games.medals[id] ?? 0;
/** a game open but never played: its card glows in the album */
export const gameIsNew = (id: string): boolean => gameOpen(id) && !(id in state.games.medals);

const heroById = (id: string): Hero => HEROES.find((x) => x.id === id)!;

/** The first game is a gift: it opens as soon as its hero is awake. True when it just opened. */
export function giftFirstGame(): boolean {
  const first = GAME_HEROES[0];
  if (state.games.open.length > 0 || !state.heroes.done.includes(first)) return false;
  state.games.open.push(first);
  save();
  return true;
}

/** The key of the daily chest: opens the next game whose hero is awake (null when there is none).
 *  The caller saves. */
export function openNextGame(): Hero | null {
  giftFirstGame();
  const id = GAME_HEROES.find((g) => !state.games.open.includes(g) && state.heroes.done.includes(g));
  if (!id) return null;
  state.games.open.push(id);
  return heroById(id);
}

/** A game played to the end: a medal when it is passed (4 first-try answers out of 5), up to 3.
 *  Returns the medals before and after. */
export function endHeroGame(id: GameHero, firstTry: number, rounds: number): { before: number; after: number } {
  const before = medalsOf(id);
  const passed = firstTry >= rounds - 1;
  const after = passed ? Math.min(MEDALS, before + 1) : before;
  state.games.medals[id] = after;
  save();
  return { before, after };
}
