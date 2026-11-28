// Les petits jeux des amis (src/heroGames.ts dit lesquels sont ouverts). Chacun a 3 paliers :
// le palier joué est le nombre de médailles déjà gagnées (0, 1 ou 2, puis on rejoue le dernier).
//   Kaze      : attrape la lettre que Pixel dit (reconnaître les lettres)
//   Flammèche : allume autant de bougies que le nombre (construire une collection)
//   Corail    : va au trésor avec les flèches (se repérer, gauche / droite, puis coder un chemin)
import { sfx } from '../audio';
import { NUMBER_WORDS as W } from '../content/counting';
import { GAME_INTROS, HEROES } from '../content/heroes';
import { LETTER_SPEECH } from '../content/writing';
import type { Game, Round } from '../game';
import type { GameHero } from '../heroGames';
import { heroSVG } from '../heroArt';
import { chestSVG } from '../pixel';
import { pickWeighted } from '../state';
import { h, rand, reducedMotion, shuffle } from '../ui';
import { plaque } from './reading';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

export interface HeroGameSpec {
  game: Game;
  /** spoken when the game starts */
  intro: string;
  /** the screen's colours and layout (`act-…` class of the activity screen) */
  activity: 'sounds' | 'count';
}

export function heroGame(id: GameHero, tier: number): HeroGameSpec {
  const intro = GAME_INTROS[id][tier];
  switch (id) {
    case 'kaze':
      return { game: kazeGame(tier), intro, activity: 'sounds' };
    case 'flammeche':
      return { game: flammecheGame(tier), intro, activity: 'count' };
    case 'corail':
      return { game: corailGame(tier), intro, activity: 'count' };
  }
}

/** the right answer shines (the last help, as in the levels) */
async function shine(r: Round, el: Element | null | undefined): Promise<void> {
  if (!el || !r.open()) return;
  el.classList.add('hint');
  await r.say('Regarde celui qui brille !');
}

// ---------------------------------------------------------------- Kaze : les lettres
/** Letters children mix up, offered together at the last tier */
const LOOK_ALIKE: Record<string, string> = { b: 'dpq', d: 'bqp', p: 'qbd', q: 'pdb', m: 'nu', n: 'mu', u: 'nv', v: 'uy', f: 't', t: 'fl', l: 'ti', i: 'jl', j: 'i', a: 'o', o: 'ae', e: 'ac', c: 'eo', h: 'n', r: 'n', s: 'z', z: 's', g: 'q', y: 'v', x: 'k', k: 'x' };
/** said « la lettre : … » (LETTER_SPEECH: the letter itself, « euh », « hache », « i grec »…) */
export const letterName = (l: string) => LETTER_SPEECH[l].name;
/** the letters of the game (w is rare in French words: left out) */
export const KAZE_LETTERS = Object.keys(LETTER_SPEECH).filter((l) => l !== 'w');

function kazeGame(tier: number): Game {
  const count = [3, 4, 5][tier];
  let target = '';
  let prev: string | undefined;
  let buttons: HTMLButtonElement[] = [];
  const shown = (l: string) => (tier === 0 ? l.toUpperCase() : l);
  return {
    rounds: 5,
    setup(r) {
      target = pickWeighted(KAZE_LETTERS, (l) => `jeu:kaze:${l}`, prev);
      prev = target;
      const options = new Set([target]);
      if (tier === 2) for (const l of shuffle([...(LOOK_ALIKE[target] ?? '')])) if (options.size < count && KAZE_LETTERS.includes(l)) options.add(l);
      while (options.size < count) options.add(rand(KAZE_LETTERS));
      r.choices.classList.add('kaze');
      buttons = shuffle([...options]).map((l, i) => {
        const b = plaque(shown(l), 'shuriken', `la lettre ${letterName(l)}`);
        if (!reducedMotion()) b.style.animationDelay = `${-i * 0.7}s`;
        b.onclick = () => void pick(r, l, b);
        return b;
      });
      r.choices.append(...buttons);
      // the first tier shows the letter to find: matching its shape is the first step
      r.bubble(tier === 0 ? shown(target) : '?');
      return `jeu:kaze:${target}`;
    },
    ask: (r) => r.say(`Attrape la lettre : ${letterName(target)} !`),
  };
  async function pick(r: Round, l: string, b: HTMLButtonElement): Promise<void> {
    if (!r.open()) return;
    if (l === target) return r.win(b);
    r.miss(b);
    if (r.misses === 1) await r.say(`Ça, c'est la lettre : ${letterName(l)}. Attrape la lettre : ${letterName(target)} !`);
    else await shine(r, buttons.find((x) => x.getAttribute('aria-label') === `la lettre ${letterName(target)}`));
  }
}

// ---------------------------------------------------------------- Flammèche : les bougies
const FLAME = '<svg viewBox="0 0 6 8" shape-rendering="crispEdges" aria-hidden="true"><rect x="2" y="0" width="2" height="2" fill="#f7dc6f"/><rect x="1" y="2" width="4" height="3" fill="#f39c12"/><rect x="2" y="3" width="2" height="2" fill="#f7dc6f"/><rect x="1" y="5" width="4" height="1" fill="#e74c3c"/></svg>';
/** « Allume trois bougies ! » */
export const candleOrder = (n: number) => (n === 1 ? 'Allume une bougie !' : `Allume ${W[n]} bougies !`);
/** « Tu as allumé deux bougies. » */
export const candleCount = (c: number) => (c === 0 ? "Tu n'as allumé aucune bougie." : c === 1 ? 'Tu as allumé une bougie.' : `Tu as allumé ${W[c]} bougies.`);
export const candleNeed = (n: number) => (n === 1 ? 'Il en faut une.' : `Il en faut ${W[n]}.`);
export const candleDone = (n: number) => (n === 1 ? 'Une bougie allumée !' : `${cap(W[n])} bougies allumées !`);

function flammecheGame(tier: number): Game {
  const [lo, hi, total] = [
    [1, 5, 6],
    [3, 8, 10],
    [4, 10, 10],
  ][tier];
  let n = 0;
  let prev: number | undefined;
  let candles: HTMLButtonElement[] = [];
  let lit: boolean[] = [];
  return {
    rounds: 5,
    setup(r) {
      n = pickWeighted(range(lo, hi), (k) => `jeu:bougies:${k}`, prev);
      prev = n;
      lit = Array(total).fill(false);
      const cake = h('div', { class: 'cake' });
      candles = lit.map((_, i) => {
        const c = h('button', { class: 'candle', 'aria-label': `bougie ${i + 1}` }, h('span', { class: 'flame', html: FLAME }));
        c.onclick = () => toggle(r, i);
        return c;
      });
      cake.append(h('div', { class: 'candles' }, ...candles), h('div', { class: 'cake-body' }));
      // the number to reach: written and said (1st tier), only said (2nd), only written (3rd)
      if (tier !== 1) r.stage.append(plaque(String(n), 'target-number', String(n)));
      r.stage.append(cake);
      const ready = h('button', { class: 'btn big green ready-btn' }, "C'est prêt !");
      ready.onclick = () => void check(r, ready);
      r.choices.append(ready);
      r.bubble(tier === 1 ? 'Écoute bien !' : 'Regarde !');
      return `jeu:bougies:${n}`;
    },
    ask: (r) => r.say(tier === 2 ? 'Allume autant de bougies que ce nombre !' : candleOrder(n)),
  };
  function toggle(r: Round, i: number): void {
    if (!r.open()) return;
    lit[i] = !lit[i];
    candles[i].classList.toggle('lit', lit[i]);
    sfx.tap();
    // first tier: Pixel counts the candles lit so far
    const c = lit.filter(Boolean).length;
    if (tier === 0 && lit[i]) void r.say(W[c]);
  }
  async function check(r: Round, btn: HTMLElement): Promise<void> {
    if (!r.open()) return;
    const c = lit.filter(Boolean).length;
    if (c === n) return r.win(btn, () => r.say(candleDone(n)));
    r.miss(btn);
    if (r.misses === 1) return r.say(`${candleCount(c)} ${candleNeed(n)}`);
    // then the candles to light shine, the others go out
    lit = lit.map(() => false);
    candles.forEach((x, i) => {
      x.classList.remove('lit');
      x.classList.toggle('hint', i < n);
    });
    await r.say('Allume les bougies qui brillent !');
  }
}

// ---------------------------------------------------------------- Corail : le trésor
type Dir = 'left' | 'right' | 'up' | 'down';
const DIRS: Dir[] = ['left', 'right', 'up', 'down'];
const STEP: Record<Dir, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const OPPOSITE: Record<Dir, Dir> = { left: 'right', right: 'left', up: 'down', down: 'up' };
const ARROW: Record<Dir, string> = { left: '←', right: '→', up: '↑', down: '↓' };
/** « à droite », « en haut » */
export const DIR_WORD: Record<Dir, string> = { left: 'à gauche', right: 'à droite', up: 'en haut', down: 'en bas' };
/** « Ça, c'est la gauche. » */
export const DIR_THIS: Record<Dir, string> = { left: "Ça, c'est la gauche.", right: "Ça, c'est la droite.", up: "Ça, c'est en haut.", down: "Ça, c'est en bas." };
export const goLine = (moves: Dir[]) => (moves.length === 1 ? `Va ${DIR_WORD[moves[0]]} !` : `Va ${DIR_WORD[moves[0]]}, puis ${DIR_WORD[moves[1]]} !`);
export const CORAIL_DIRS = DIRS;

function corailGame(tier: number): Game {
  const size = tier === 0 ? 4 : 5;
  const steps = [3, 4, 3][tier];
  let pos: [number, number] = [0, 0];
  let start: [number, number] = [0, 0];
  let moves: Dir[] = [];
  let done = 0; // moves made (tiers 1 and 2)
  let program: Dir[] = [];
  let cells: HTMLElement[] = [];
  let ship: HTMLElement;
  let treasure: HTMLElement;
  let arrows: Record<Dir, HTMLButtonElement>;
  let strip: HTMLElement;
  const corail = HEROES.find((x) => x.id === 'corail')!;

  /** a walk of `steps` moves that never leaves the map nor comes back on itself */
  function walk(): { from: [number, number]; path: Dir[] } {
    for (;;) {
      const from: [number, number] = [Math.floor(Math.random() * size), Math.floor(Math.random() * size)];
      const seen = new Set([from.join()]);
      const path: Dir[] = [];
      let [x, y] = from;
      for (let guard = 0; path.length < steps && guard < 40; guard++) {
        const d = rand(DIRS.filter((k) => path.length === 0 || k !== OPPOSITE[path[path.length - 1]]));
        const [nx, ny] = [x + STEP[d][0], y + STEP[d][1]];
        if (nx < 0 || ny < 0 || nx >= size || ny >= size || seen.has(`${nx},${ny}`)) continue;
        [x, y] = [nx, ny];
        seen.add(`${x},${y}`);
        path.push(d);
      }
      if (path.length === steps) return { from, path };
    }
  }
  const cellAt = (p: [number, number]) => cells[p[1] * size + p[0]];
  function place(): void {
    cellAt(pos).append(ship);
  }
  /** what Pixel says now: the next move, or the next two (tier 2) */
  const nextMoves = () => moves.slice(done, done + (tier === 1 ? 2 : 1));

  return {
    rounds: 5,
    noReview: true,
    setup(r) {
      const w = walk();
      start = w.from;
      pos = [...w.from];
      moves = w.path;
      done = 0;
      program = [];
      let [tx, ty] = start;
      for (const d of moves) [tx, ty] = [tx + STEP[d][0], ty + STEP[d][1]];
      const map = h('div', { class: 'sea', role: 'img', 'aria-label': 'La carte du trésor' });
      map.style.setProperty('--n', String(size));
      cells = range(0, size * size - 1).map(() => h('div', { class: 'sea-cell' }));
      map.append(...cells);
      ship = h('div', { class: 'ship', html: heroSVG(corail, 'all', 40) });
      treasure = h('div', { class: 'treasure', html: chestSVG(40, false) });
      cells[ty * size + tx].append(treasure);
      place();
      r.stage.append(map);
      arrows = Object.fromEntries(
        DIRS.map((d) => {
          const b = h('button', { class: `arrow arrow-${d}`, 'aria-label': DIR_WORD[d] }, ARROW[d]);
          b.onclick = () => void press(r, d, b);
          return [d, b];
        }),
      ) as Record<Dir, HTMLButtonElement>;
      const pad = h('div', { class: 'arrow-pad' }, arrows.up, arrows.left, arrows.right, arrows.down);
      r.choices.classList.add('corail');
      if (tier === 2) {
        strip = h('div', { class: 'program', 'aria-label': 'Le chemin' });
        const undo = h('button', { class: 'btn undo', 'aria-label': 'Effacer' }, '⌫');
        undo.onclick = () => {
          if (!r.open() || !program.length) return;
          program.pop();
          strip.lastElementChild?.remove();
          sfx.tap();
        };
        const go = h('button', { class: 'btn big green go', 'aria-label': 'Partir' }, '▶');
        go.onclick = () => void run(r, go);
        r.choices.append(strip, h('div', { class: 'program-row' }, pad, h('div', { class: 'program-actions' }, go, undo)));
        r.bubble('?');
      } else {
        r.choices.append(pad);
        r.bubble('Écoute bien !'); // no arrows here: telling left from right by ear is the point
      }
      return `jeu:tresor:${tier}`;
    },
    ask: (r) => (tier === 2 ? r.say('Trouve le chemin du trésor !') : r.say(goLine(nextMoves()))),
  };

  async function move(r: Round, d: Dir): Promise<boolean> {
    const [nx, ny] = [pos[0] + STEP[d][0], pos[1] + STEP[d][1]];
    if (nx < 0 || ny < 0 || nx >= size || ny >= size) return false;
    pos = [nx, ny];
    sfx.hop();
    place();
    return r.wait(reducedMotion() ? 50 : 280);
  }

  async function press(r: Round, d: Dir, b: HTMLButtonElement): Promise<void> {
    if (!r.open()) return;
    if (tier === 2) {
      if (program.length >= 8) return;
      program.push(d);
      strip.append(h('span', { class: 'step' }, ARROW[d]));
      sfx.tap();
      return;
    }
    const want = moves[done];
    if (d !== want) {
      r.miss(b);
      if (r.misses === 1) await r.say(`${DIR_THIS[d]} ${goLine(nextMoves())}`);
      else await shine(r, arrows[want]);
      return;
    }
    Object.values(arrows).forEach((x) => x.classList.remove('hint'));
    r.hold(true);
    await move(r, d);
    done++;
    r.hold(false);
    if (done === moves.length) return r.win(treasure, () => r.say('Le trésor !'));
    // 2nd tier (two moves said at once): the next instruction comes once both are done
    if (tier === 0 || done % 2 === 0) await r.say(goLine(nextMoves()));
  }

  async function run(r: Round, btn: HTMLElement): Promise<void> {
    if (!r.open() || !program.length) return;
    r.hold(true);
    for (const d of program) if (!(await move(r, d))) break;
    const [tx, ty] = moves.reduce<[number, number]>((p, d) => [p[0] + STEP[d][0], p[1] + STEP[d][1]], [...start]);
    r.hold(false);
    if (pos[0] === tx && pos[1] === ty) return r.win(treasure, () => r.say('Le trésor !'));
    r.miss(btn);
    // back to the start, the path is cleared
    if (!(await r.wait(500))) return;
    pos = [...start];
    place();
    program = [];
    strip.replaceChildren();
    if (r.misses === 1) await r.say("Oh non, ce n'est pas le trésor. On recommence !");
    else {
      // the way shows, square by square
      let p: [number, number] = [...start];
      for (const d of moves) {
        p = [p[0] + STEP[d][0], p[1] + STEP[d][1]];
        cellAt(p).classList.add('trail');
      }
      await r.say('Suis les pointillés !');
    }
  }
}
