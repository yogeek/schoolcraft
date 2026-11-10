// Jeux de l'activité « Compter » (contenu : src/content/counting.ts).
import { sfx } from '../audio';
import { DICE, NUMBER_WORDS as W, THINGS, type CountLevel, type Thing } from '../content/counting';
import { HEROES } from '../content/heroes';
import type { Game, Round } from '../game';
import { heroSVG } from '../heroArt';
import { foxSVG } from '../pixel';
import { COMMON_BLOCKS, pickWeighted, state, type BlockType } from '../state';
import { blockImg, h, rand, reducedMotion, shuffle } from '../ui';
import { plaque } from './reading';

const FLASH_MS = 2000;
const COUNTED = ['Bien compté !', 'Bravo !', 'Super !', 'Oui, bien joué !', 'Génial !'];

const blockType = (): BlockType => rand(COMMON_BLOCKS.filter((t) => t !== 'glass'));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
/** « un » / « une » */
const one = (n: number, fem: boolean) => (n === 1 ? (fem ? 'une' : 'un') : W[n]);

export function countingGame(level: CountLevel): Game {
  switch (level.mode) {
    case 'count':
    case 'flash':
    case 'frame':
      return countGame(level);
    case 'compare':
    case 'digits':
      return compareGame(level);
    case 'race':
      return raceGame(level);
    case 'hide':
      return hideGame(level);
    case 'make10':
      return make10Game(level);
    case 'add':
      return addGame(level);
    case 'problem':
      return problemGame(level);
    case 'tens':
      return tensGame(level);
  }
}

/** Number answers around `target`, inside [lo, hi] (no "7" when counting up to 4). */
function numberChoices(r: Round, target: number, n: number, lo: number, hi: number, onPick: (k: number, el: HTMLElement) => void): void {
  const options = new Set<number>([target]);
  const top = Math.min(hi, target + 3);
  const bottom = Math.max(lo, Math.min(target - 3, top - n + 1));
  for (let guard = 0; options.size < n && guard < 200; guard++) options.add(bottom + Math.floor(Math.random() * (top - bottom + 1)));
  r.choices.classList.add('numbers');
  r.choices.append(
    ...shuffle([...options]).map((k) => {
      const b = plaque(String(k));
      b.onclick = () => onPick(k, b);
      return b;
    }),
  );
}

/** after two mistakes, Pixel counts with the child: each thing lights up as its number is said */
async function countTogether(r: Round, els: Element[]): Promise<void> {
  if (!r.open() || !els.length) return;
  r.hold(true);
  await r.say('On compte ensemble !');
  for (let i = 0; i < els.length; i++) {
    els[i].classList.add('glow');
    await r.say(W[i + 1], { rate: 1 });
  }
  r.hold(false);
}

/** the last help, after the child was counted with: the right answer shines (as in Lire) */
async function shine(r: Round, el: Element | null | undefined): Promise<void> {
  if (!el || !r.open()) return;
  el.classList.add('hint');
  await r.say('Regarde celui qui brille !');
}

/** the number button showing `n` */
const numberEl = (r: Round, n: number) => [...r.choices.querySelectorAll('.choice')].find((e) => e.getAttribute('aria-label') === String(n));

function shake(el: Element): void {
  el.classList.remove('shake');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('shake');
}

// ---------------------------------------------------------------- count, dice, ten-frame
function countGame(level: CountLevel): Game {
  const pool = range(level.min, level.max);
  const key = (n: number) => `count:${level.mode}:${n}`;
  let target = 0;
  let prev: number | undefined;
  let counted = 0;
  let flashSeq = 0;
  let pile: HTMLElement = h('div');

  async function flash(r: Round): Promise<void> {
    const my = ++flashSeq;
    pile.classList.remove('covered');
    r.bubble('Regarde bien !');
    await r.say('Regarde bien !');
    if (!(await r.wait(FLASH_MS)) || my !== flashSeq || !r.open()) return;
    pile.classList.add('covered');
    r.bubble('Combien de blocs ?');
    await r.say('Combien y avait-il de blocs ?');
  }

  return {
    praise: COUNTED,
    setup(r) {
      target = pickWeighted(pool, key, prev);
      prev = target;
      counted = 0;
      flashSeq++;
      const type = blockType();
      pile = h('div', { class: 'pile' });
      if (level.mode === 'count') {
        for (let i = 0; i < target; i++) {
          const b = h('button', { class: 'pile-block', 'aria-label': 'bloc' }, blockImg(type));
          b.onclick = () => {
            if (!r.open() || b.classList.contains('counted')) return;
            sfx.tap();
            counted++;
            b.classList.add('counted');
            b.dataset.n = String(counted);
            void r.say(W[counted] ?? String(counted), { rate: 1 });
          };
          pile.append(b);
        }
        r.bubble('Combien de blocs ?');
      } else if (level.mode === 'flash') {
        pile.classList.add('dice', 'covered'); // hidden until "Regarde bien !"
        const cells = DICE[target];
        for (let i = 0; i < 9; i++) pile.append(cells.includes(i) ? h('div', { class: 'pile-block', 'aria-hidden': 'true' }, blockImg(type)) : h('span'));
        r.bubble('Regarde bien !');
      } else {
        pile.classList.add('frame', 'covered');
        for (let i = 0; i < 10; i++) pile.append(h('div', { class: `frame-cell${i < target ? ' full' : ''}`, 'aria-hidden': 'true' }, i < target ? blockImg(type) : ''));
        r.bubble('Regarde bien !');
      }
      r.stage.append(pile);
      numberChoices(r, target, level.choices, Math.max(1, level.min - 1), level.max, async (k, el) => {
        if (!r.open()) return;
        sfx.unlock();
        if (k === target) {
          flashSeq++; // stop a pending "hide"
          pile.classList.remove('covered');
          return r.win(el, async () => {
            r.bubble(`Oui, ${target} !`);
            if (level.mode === 'frame' && target > 5) await r.say(`Cinq… et ${W[target - 5]}… ${W[target]} !`);
            else if (level.mode === 'frame' && target === 5) await r.say('Une rangée pleine : cinq !');
            else await r.say(`Il y a ${W[target]} bloc${target > 1 ? 's' : ''} !`);
          });
        }
        r.miss(el);
        if (r.misses >= 2) {
          // the blocks stay in sight and Pixel counts them with the child
          flashSeq++;
          pile.classList.remove('covered');
          pile.querySelectorAll('.counted').forEach((b) => b.classList.remove('counted'));
          await r.say(`Ça, c'est le nombre ${W[k]}.`);
          if (r.misses >= 3) return shine(r, numberEl(r, target));
          await countTogether(r, [...pile.querySelectorAll('.pile-block, .frame-cell.full')]);
          if (r.open()) await r.say('Combien y a-t-il de blocs ?');
          return;
        }
        if (level.mode !== 'count') {
          await r.say(`Ça, c'est le nombre ${W[k]}. Regarde encore !`);
          if (r.open()) await flash(r);
          return;
        }
        // help: start the counting again, one by one
        pile.querySelectorAll('.counted').forEach((b) => b.classList.remove('counted'));
        counted = 0;
        await r.say(`Ça, c'est le nombre ${W[k]}. Compte les blocs avec ton doigt !`);
      });
      return key(target);
    },
    ask(r) {
      if (level.mode !== 'count') return flash(r);
      r.bubble('Combien de blocs ?');
      return r.say(counted === 0 ? 'Combien y a-t-il de blocs ? Touche-les pour les compter !' : 'Combien y a-t-il de blocs ?');
    },
  };
}

// ---------------------------------------------------------------- the biggest pile / number
function compareGame(level: CountLevel): Game {
  const digits = level.mode === 'digits';
  const pairs: [number, number][] = [];
  for (let a = level.min; a <= level.max; a++) for (let b = level.min; b < a; b++) pairs.push([a, b]);
  const key = (p: [number, number]) => `count:${level.mode}:${p[0]}>${p[1]}`;
  let pair: [number, number] = pairs[0];
  let prev: [number, number] | undefined;
  let more = true;
  const word = () => (digits ? (more ? 'le plus grand' : 'le plus petit') : more ? 'le plus' : 'le moins');

  return {
    praise: COUNTED,
    setup(r) {
      pair = pickWeighted(pairs, key, prev);
      prev = pair;
      more = Math.random() < (digits ? 0.75 : 0.7);
      const [big, small] = pair;
      const want = more ? big : small;
      const sides = shuffle([big, small]);
      r.bubble(digits ? (more ? 'Le plus grand ?' : 'Le plus petit ?') : more ? 'Le plus de blocs ?' : 'Le moins de blocs ?');
      r.choices.classList.add('kind-compare');
      r.choices.append(
        ...sides.map((n) => {
          let b: HTMLElement;
          if (digits) b = plaque(String(n), 'big-number');
          else {
            const type = blockType();
            // blocks spread at random in a 3 × 3 grid: the length of a row is no clue
            const cells = shuffle(range(0, 8)).slice(0, n);
            b = h('button', { class: 'pile-choice', 'aria-label': `tas de ${n}` });
            for (let i = 0; i < 9; i++) b.append(cells.includes(i) ? blockImg(type) : h('span'));
          }
          b.onclick = async () => {
            if (!r.open()) return;
            sfx.unlock();
            if (n === want) {
              return r.win(b, async () => {
                r.bubble(more ? `${big} > ${small}` : `${small} < ${big}`);
                await r.say(more ? `${W[big]}, c'est plus que ${W[small]} !` : `${W[small]}, c'est moins que ${W[big]} !`);
              });
            }
            r.miss(b);
            // two answers only: the hint first, then the right one shines
            if (r.misses >= 2) return shine(r, [...r.choices.children].find((x) => x !== b));
            await r.say(digits ? `Ça, c'est ${W[n]}. Cherche ${word()} !` : `Ce tas a ${n === 1 ? 'un bloc' : `${W[n]} blocs`}. Cherche le tas qui en a ${word()} !`);
          };
          return b;
        }),
      );
      return key(pair);
    },
    ask(r) {
      r.bubble(digits ? (more ? 'Le plus grand ?' : 'Le plus petit ?') : more ? 'Le plus de blocs ?' : 'Le moins de blocs ?');
      return r.say(digits ? `Touche le nombre ${word()} !` : `Touche le tas qui a ${word()} de blocs !`);
    },
  };
}

// ---------------------------------------------------------------- the number race (linear board game)
/** `parts` random numbers in [1, max] adding up to `sum`. */
function split(sum: number, parts: number, max: number): number[] {
  for (let guard = 0; guard < 500; guard++) {
    const out = Array.from({ length: parts }, () => 1 + Math.floor(Math.random() * max));
    const s = out.reduce((a, b) => a + b, 0);
    if (s === sum) return out;
  }
  // fallback: as even as possible
  const out = Array.from({ length: parts }, (_, i) => Math.floor(sum / parts) + (i < sum % parts ? 1 : 0));
  return out.map((v) => Math.min(max, Math.max(1, v)));
}

function raceGame(level: CountLevel): Game {
  const turns = 5;
  const die = level.die ?? 3;
  const end = level.max;
  const mine = split(end, turns, die); // the child reaches the last square on the last turn
  const fox = split(Math.max(turns - 1, Math.round(end * 0.7)), turns - 1, die); // Pixel stays a little behind
  let pos = 0;
  let foxPos = 0;
  let turn = 0;
  let rolled = 0;
  const lastHero = HEROES.find((x) => x.id === state.heroes.done[state.heroes.done.length - 1]);

  return {
    praise: ['Bien compté !', 'Bravo !', 'Super !', 'Oui !'],
    noReview: true,
    rounds: turns,
    setup(r) {
      rolled = 0;
      const roll = mine[turn];
      const target = pos + roll;
      r.bubble('Lance le dé !');
      r.stage.classList.add('race-stage');
      // the board: a line of squares from the start to `end`, ten per row
      const track = h('div', { class: `track${end > 10 ? ' two-rows' : ''}` });
      const squares: HTMLElement[] = [];
      const start = h('div', { class: 'square start', 'aria-label': 'départ' }, h('span', { class: 'sq-label' }, '🏁'));
      squares.push(start);
      for (let n = 1; n <= end; n++) {
        const sq = h('button', { class: `square${n === end ? ' finish' : ''}`, 'aria-label': `case ${n}` }, h('span', { class: 'sq-label' }, String(n)));
        sq.onclick = () => void land(n, sq);
        squares.push(sq);
      }
      if (end > 10) {
        // one path that turns back (11 right under 10): the numbers stay neighbours all along,
        // which is what makes a linear board work; the start sits before 1
        const row1 = h('div', { class: 'track-row' }, start, ...squares.slice(1, 11));
        const row2 = h('div', { class: 'track-row back' }, ...squares.slice(11), h('div', { class: 'square ghost' }));
        track.append(row1, h('div', { class: 'track-turn', 'aria-hidden': 'true' }, '↓'), row2);
      } else track.append(...squares);
      const me = h('div', { class: 'token me', 'aria-hidden': 'true', html: lastHero ? heroSVG(lastHero, 'all', 30) : '' });
      if (!lastHero) me.append(blockImg('gold'), h('span', { class: 'token-star' }, '★'));
      const px = h('div', { class: 'token fox', 'aria-hidden': 'true', html: foxSVG(30) });
      const put = (tok: HTMLElement, at: number) => squares[at].append(tok);
      put(px, foxPos);
      put(me, pos);
      r.stage.append(track);

      const dieBtn = h('button', { class: 'die', 'aria-label': 'Lancer le dé' }, h('span', { class: 'die-face' }, '?'));
      r.choices.classList.add('kind-race');
      r.choices.append(dieBtn);

      const showFace = (v: number) => {
        const face = h('span', { class: 'die-face dots' });
        for (let i = 0; i < 9; i++) face.append(h('span', { class: DICE[v].includes(i) ? 'dot' : '' }));
        dieBtn.replaceChildren(face);
        dieBtn.setAttribute('aria-label', `Le dé : ${v}`);
      };

      dieBtn.onclick = async () => {
        if (!r.open() || rolled) return;
        sfx.unlock();
        sfx.roll();
        r.hold(true);
        dieBtn.classList.add('rolling');
        for (let i = 0; i < 6 && !reducedMotion(); i++) {
          showFace(1 + Math.floor(Math.random() * die));
          if (!(await r.wait(80))) return;
        }
        dieBtn.classList.remove('rolling');
        rolled = roll;
        showFace(roll);
        r.hold(false);
        r.bubble(`Le dé : ${roll}`);
        await r.say(`${W[roll]} ! Touche la case où tu arrives.`);
      };

      const hop = async (tok: HTMLElement, from: number, to: number, speak: boolean) => {
        for (let n = from + 1; n <= to; n++) {
          put(tok, n);
          sfx.hop();
          if (!reducedMotion()) tok.animate([{ transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 220 });
          squares[n].classList.add('passed');
          if (speak) await r.say(W[n], { rate: 1.05 });
          else if (!(await r.wait(260))) return;
        }
      };

      const land = async (n: number, sq: HTMLElement) => {
        if (!r.open()) return;
        sfx.unlock();
        if (!rolled) {
          shake(dieBtn);
          r.bubble("Lance d'abord le dé !");
          await r.say("Lance d'abord le dé !");
          return;
        }
        if (n !== target) {
          r.miss(sq);
          await r.say(`Tu es sur ${pos === 0 ? 'le départ' : `le ${W[pos]}`}. Tu avances de ${W[roll]}.`);
          if (r.misses >= 3) return shine(r, squares[target]);
          if (r.misses >= 2 && r.open()) {
            // count the squares together, without moving
            r.hold(true);
            for (let k = pos + 1; k <= target; k++) {
              squares[k].classList.add('glow');
              await r.say(W[k], { rate: 1 });
            }
            r.hold(false);
            if (r.open()) await r.say('Touche la dernière case !');
          }
          return;
        }
        squares.forEach((s) => s.classList.remove('glow'));
        r.hold(true);
        await hop(me, pos, target, true);
        pos = target;
        r.hold(false);
        turn++;
        await r.win(sq, async () => {
          if (pos >= end) {
            r.bubble('Gagné !');
            sfx.fanfare();
            await r.say('Tu as gagné la course ! Bravo !');
            return;
          }
          // Pixel's turn
          const v = fox[turn - 1] ?? 1;
          r.bubble(`À Pixel : ${v}`);
          await r.say(`À moi ! Le dé dit : ${W[v]}.`);
          const to = Math.min(end - 1, foxPos + v);
          await hop(px, foxPos, to, false);
          foxPos = to;
          await r.wait(300);
        });
      };
      return `count:race:${target}`;
    },
    ask(r) {
      if (rolled) {
        r.bubble('Où arrives-tu ?');
        return r.say(`Le dé dit : ${W[rolled]}. Touche la case où tu arrives.`);
      }
      r.bubble('Lance le dé !');
      return r.say(turn === 0 ? 'Touche le dé pour le lancer !' : 'À toi ! Lance le dé.');
    },
  };
}

// ---------------------------------------------------------------- the cave (how many are hidden?)
function hideGame(level: CountLevel): Game {
  const pairs: [number, number][] = [];
  for (let n = level.min; n <= level.max; n++) for (let k = 1; k < n; k++) pairs.push([n, k]);
  const key = (p: [number, number]) => `count:hide:${p[0]}-${p[1]}`;
  let pair: [number, number] = pairs[0];
  let prev: [number, number] | undefined;
  let hidden = false;
  let blocks: HTMLElement[] = [];
  let cave: HTMLElement = h('div');

  async function hideThem(r: Round): Promise<void> {
    const [n, k] = pair;
    r.hold(true);
    r.bubble(`Il y a ${n} blocs`);
    await r.say(`Il y a ${W[n]} blocs.`);
    if (!hidden) {
      if (!(await r.wait(300))) return;
      // the last k blocks walk into the cave
      blocks.slice(n - k).forEach((b, i) => setTimeout(() => b.classList.add('in-cave'), i * 160));
      sfx.place();
      if (!(await r.wait(500 + k * 160))) return;
      hidden = true;
      cave.classList.add('full');
    }
    r.hold(false);
    r.bubble('Combien sont cachés ?');
    await r.say(`Il en reste ${W[n - k]} dehors. Combien sont cachés dans la grotte ?`);
  }

  return {
    praise: COUNTED,
    setup(r) {
      pair = pickWeighted(pairs, key, prev);
      prev = pair;
      hidden = false;
      const [n, k] = pair;
      const type = blockType();
      r.stage.classList.add('cave-stage');
      const sign = h('div', { class: 'sign', 'aria-label': `${n} blocs en tout` }, String(n));
      const row = h('div', { class: 'cave-row' });
      blocks = range(1, n).map(() => h('div', { class: 'pile-block small', 'aria-hidden': 'true' }, blockImg(type)));
      row.append(...blocks);
      cave = h('div', { class: 'cave', 'aria-label': 'la grotte' }, h('span', { class: 'cave-q' }, '?'));
      const ghosts = h('div', { class: 'cave-ghosts' });
      for (let i = 0; i < k; i++) ghosts.append(h('span'));
      cave.append(ghosts);
      r.stage.append(sign, h('div', { class: 'cave-scene' }, row, cave));
      r.bubble(`Il y a ${n} blocs`);
      numberChoices(r, k, level.choices, 1, n - 1, async (v, el) => {
        if (!r.open()) return;
        sfx.unlock();
        if (v === k) {
          return r.win(el, async () => {
            cave.classList.remove('full');
            cave.classList.add('open');
            blocks.forEach((b) => b.classList.remove('in-cave'));
            r.bubble(`${n - k} + ${k} = ${n}`);
            await r.say(`${k === 1 ? 'Un caché' : `${W[k]} cachés`} ! ${W[n - k]} et ${W[k]}, ça fait ${W[n]}.`);
          });
        }
        r.miss(el);
        await r.say(`Il y avait ${W[n]} blocs. Il en reste ${W[n - k]} dehors.`);
        if (r.misses >= 3) return shine(r, numberEl(r, k));
        // after two mistakes, the hidden places show (count them)
        if (r.misses >= 2) cave.classList.add('hint');
        if (r.open()) await r.say(r.misses >= 2 ? 'Compte les places dans la grotte !' : 'Combien sont cachés ?');
      });
      return key(pair);
    },
    ask(r) {
      return hideThem(r);
    },
  };
}

// ---------------------------------------------------------------- make ten (ten-frame)
function make10Game(level: CountLevel): Game {
  const pool = range(level.min, level.max);
  const key = (n: number) => `count:make10:${n}`;
  let n = 5;
  let prev: number | undefined;

  return {
    praise: COUNTED,
    setup(r) {
      n = pickWeighted(pool, key, prev);
      prev = n;
      const type = blockType();
      const frame = h('div', { class: 'pile frame' });
      const empty: HTMLElement[] = [];
      for (let i = 0; i < 10; i++) {
        const cell = h('div', { class: `frame-cell${i < n ? ' full' : ''}`, 'aria-hidden': 'true' }, i < n ? blockImg(type) : '');
        if (i >= n) empty.push(cell);
        frame.append(cell);
      }
      r.stage.append(frame);
      r.bubble(`${n} + ? = 10`);
      numberChoices(r, 10 - n, level.choices, 1, 6, async (v, el) => {
        if (!r.open()) return;
        sfx.unlock();
        if (v === 10 - n) {
          return r.win(el, async () => {
            r.bubble(`${n} + ${10 - n} = 10`);
            for (let i = 0; i < empty.length; i++) {
              empty[i].replaceChildren(blockImg('gold'));
              empty[i].classList.add('full', 'new');
              sfx.place();
              await r.say(W[n + i + 1], { rate: 1.05 });
            }
            await r.say(`${W[n]} et ${W[10 - n]}, ça fait dix !`);
          });
        }
        r.miss(el);
        empty.forEach((c) => c.classList.add('glow'));
        if (r.misses >= 3) {
          empty.forEach((c) => c.classList.remove('glow'));
          await shine(r, numberEl(r, 10 - n));
        } else if (r.misses >= 2) {
          empty.forEach((c) => c.classList.remove('glow'));
          await countTogether(r, empty);
        } else await r.say('Compte les cases vides !');
      });
      return key(n);
    },
    ask(r) {
      r.bubble(`${n} + ? = 10`);
      return r.say(`Il y a ${W[n]} blocs. Combien en manque-t-il pour faire dix ?`);
    },
  };
}

// ---------------------------------------------------------------- additions with two piles
function addGame(level: CountLevel): Game {
  const pool = range(level.min, level.max);
  const key = (n: number) => `count:add:${n}`;
  let target = 0;
  let a = 0;
  let prev: number | undefined;

  return {
    praise: COUNTED,
    setup(r) {
      target = pickWeighted(pool, key, prev);
      prev = target;
      a = 1 + Math.floor(Math.random() * (target - 1));
      const typeA = blockType();
      const typeB = rand(COMMON_BLOCKS.filter((t) => t !== 'glass' && t !== typeA));
      const groupA = h('div', { class: 'group' });
      const groupB = h('div', { class: 'group' });
      const pileBlock = (t: BlockType) => {
        const b = h('button', { class: 'pile-block', 'aria-label': 'bloc' }, blockImg(t));
        b.onclick = () => {
          if (!r.open() || b.classList.contains('counted')) return;
          sfx.tap();
          const n = pile.querySelectorAll('.counted').length + 1;
          b.classList.add('counted');
          b.dataset.n = String(n);
          void r.say(W[n] ?? String(n), { rate: 1 });
        };
        return b;
      };
      for (let i = 0; i < a; i++) groupA.append(pileBlock(typeA));
      for (let i = 0; i < target - a; i++) groupB.append(pileBlock(typeB));
      const pile = h('div', { class: 'pile sum' }, groupA, h('div', { class: 'plus', 'aria-hidden': 'true' }, '+'), groupB);
      r.stage.append(pile);
      r.bubble(`${a} + ${target - a} = ?`);
      numberChoices(r, target, level.choices, 1, level.max, async (k, el) => {
        if (!r.open()) return;
        sfx.unlock();
        if (k === target) {
          return r.win(el, async () => {
            r.bubble(`${a} + ${target - a} = ${target}`);
            await r.say(`${W[a]}… plus… ${W[target - a]}… ça fait : ${W[target]} !`);
          });
        }
        r.miss(el);
        pile.querySelectorAll('.counted').forEach((b) => b.classList.remove('counted'));
        if (r.misses >= 2) {
          await r.say(`Ça, c'est le nombre ${W[k]}.`);
          if (r.misses >= 3) return shine(r, numberEl(r, target));
          await countTogether(r, [...pile.querySelectorAll('.pile-block')]);
          return;
        }
        await r.say(`Ça, c'est le nombre ${W[k]}. Compte tous les blocs avec ton doigt !`);
      });
      return key(target);
    },
    ask(r) {
      r.bubble(`${a} + ${target - a} = ?`);
      return r.say(`Combien font : ${W[a]}… plus… ${W[target - a]} ?`);
    },
  };
}

// ---------------------------------------------------------------- little story problems
function problemGame(level: CountLevel): Game {
  let thing: Thing = THINGS[0];
  let a = 0;
  let b = 0;
  let sub = false;
  let told = false;
  let items: HTMLElement[] = [];
  const result = () => (sub ? a - b : a + b);
  const qty = (n: number) => (n === 1 ? thing.one : `${W[n]} ${thing.many}`);
  const story = () =>
    sub
      ? [`Pixel a ${qty(a)}.`, thing.gone.replace('{n}', one(b, thing.fem)), 'Combien lui en reste-t-il ?']
      : [`Pixel a ${qty(a)}.`, `Il en trouve ${one(b, thing.fem)} de plus.`, 'Combien en a-t-il maintenant ?'];

  return {
    praise: ['Bravo, problème résolu !', 'Bien calculé !', 'Super !', 'Oui, bravo !'],
    setup(r) {
      thing = rand(THINGS);
      sub = !!level.sub && Math.random() < 0.4;
      if (sub) {
        a = 3 + Math.floor(Math.random() * (level.max - 2)); // 3 … max
        b = 1 + Math.floor(Math.random() * Math.min(4, a - 1));
      } else {
        const total = level.min + Math.floor(Math.random() * (level.max - level.min + 1));
        b = 1 + Math.floor(Math.random() * Math.min(4, total - 1));
        a = total - b;
      }
      told = false;
      const row = h('div', { class: 'things' });
      items = range(1, a).map(() => h('span', { class: 'thing', 'aria-hidden': 'true' }, thing.pic));
      row.append(...items);
      r.stage.classList.add('problem-stage');
      r.stage.append(row);
      r.bubble('Écoute bien…');
      numberChoices(r, result(), level.choices, 0, 10, async (k, el) => {
        if (!r.open()) return;
        sfx.unlock();
        if (k === result()) {
          return r.win(el, async () => {
            r.bubble(`${a} ${sub ? '−' : '+'} ${b} = ${result()}`);
            await r.say(`${W[a]} ${sub ? 'moins' : 'plus'} ${W[b]}, ça fait ${W[result()]} !`);
          });
        }
        r.miss(el);
        if (r.misses >= 3) return shine(r, numberEl(r, result()));
        if (r.misses >= 2) {
          await countTogether(r, [...r.stage.querySelectorAll('.thing:not(.gone)')]);
          return;
        }
        await r.say(sub ? `Compte les ${thing.many} qui restent !` : `Compte ${thing.fem ? 'toutes' : 'tous'} les ${thing.many} !`);
      });
      return `count:problem:${sub ? 'moins' : 'plus'}:${result()}`;
    },
    async ask(r) {
      const [s1, s2, q] = story();
      r.hold(true);
      r.bubble('Écoute bien…');
      await r.say(s1);
      if (!told) {
        told = true;
        if (!(await r.wait(200))) return;
        if (sub) {
          items.slice(a - b).forEach((it, i) => setTimeout(() => it.classList.add('gone'), i * 200));
        } else {
          const row = items[0]?.parentElement;
          row?.append(h('span', { class: 'thing-plus', 'aria-hidden': 'true' }, '+'));
          for (let i = 0; i < b; i++) {
            const it = h('span', { class: 'thing added', 'aria-hidden': 'true' }, thing.pic);
            it.style.animationDelay = `${i * 200}ms`;
            row?.append(it);
          }
        }
        sfx.place();
      }
      await r.say(s2);
      r.hold(false);
      r.bubble(`${a} ${sub ? '−' : '+'} ${b} = ?`);
      await r.say(q);
    },
  };
}

// ---------------------------------------------------------------- ten and more (11–20)
function tensGame(level: CountLevel): Game {
  const pool = range(level.min, level.max);
  const key = (n: number) => `count:tens:${n}`;
  let n = 11;
  let prev: number | undefined;

  return {
    praise: COUNTED,
    setup(r) {
      n = pickWeighted(pool, key, prev);
      prev = n;
      const type = blockType();
      const scene = h('div', { class: 'tens' });
      const towers = Math.floor(n / 10);
      for (let t = 0; t < towers; t++) {
        const tower = h('div', { class: 'tower', 'aria-label': 'une tour de dix' });
        for (let i = 0; i < 10; i++) tower.append(blockImg(type));
        tower.append(h('span', { class: 'tower-label' }, '10'));
        scene.append(tower);
      }
      const loose = h('div', { class: 'loose' });
      const singles = range(1, n - towers * 10).map(() => h('div', { class: 'pile-block small', 'aria-hidden': 'true' }, blockImg(type)));
      loose.append(...singles);
      if (singles.length) scene.append(loose);
      r.stage.append(scene);
      r.bubble('Combien de blocs ?');
      numberChoices(r, n, level.choices, level.min, level.max, async (k, el) => {
        if (!r.open()) return;
        sfx.unlock();
        if (k === n) {
          return r.win(el, async () => {
            r.bubble(n === 20 ? '10 + 10 = 20' : `10 + ${n - 10} = ${n}`);
            await r.say(n === 20 ? 'Dix et dix : vingt !' : `Dix et ${W[n - 10]} : ${W[n]} !`);
          });
        }
        r.miss(el);
        if (n === 20) {
          if (r.misses >= 2) return shine(r, numberEl(r, n));
          await r.say('Deux tours de dix. Dix, et encore dix !');
          return;
        }
        if (r.misses >= 3) return shine(r, numberEl(r, n));
        await r.say('Une tour, c’est dix. Compte à partir de dix !');
        if (r.misses >= 2 && r.open()) {
          r.hold(true);
          await r.say('Dix…');
          for (let i = 0; i < singles.length; i++) {
            singles[i].classList.add('glow');
            await r.say(W[11 + i], { rate: 1 });
          }
          r.hold(false);
        }
      });
      return key(n);
    },
    ask(r) {
      r.bubble('Combien de blocs ?');
      return r.say(n === 20 ? 'Combien de blocs en tout ?' : 'Une tour, c’est dix blocs. Combien de blocs en tout ?');
    },
  };
}
