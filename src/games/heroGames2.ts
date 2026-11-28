// Les jeux des neuf autres amis de la première saison (le cadre est dans heroGames.ts).
//   Bulle   : éclate la bulle qui rime avec le mot (rimes)
//   Tao     : casse une planche par syllabe (syllabes)
//   Pousse  : quelle fleur vient après ? (suites, motifs)
//   Luna    : un objet disparaît du chapeau, lequel ? (mémoire, vocabulaire)
//   Orageon : compte les coups de tonnerre (compter sans voir)
//   Robo    : quelle pièce est différente ? (trier, logique)
//   Glaçon  : des glaçons fondent, combien en reste-t-il ? (première soustraction)
//   Brume   : cache Brume sur, sous, à côté, devant, derrière la table (vocabulaire de l'espace)
//   Astro   : quel nombre manque dans le compte à rebours ? (suite des nombres à l'envers)
// Help grows as in the levels: a first help that names or shows again, then the answer shines.
import { sfx } from '../audio';
import { NUMBER_WORDS as W } from '../content/counting';
import { HEROES } from '../content/heroes';
import { CLAP_WORDS, PIC_WORDS, RHYME_WORDS, wordLine, type PicWord } from '../content/reading';
import type { Game, Round } from '../game';
import { heroSVG } from '../heroArt';
import { pickWeighted } from '../state';
import { h, rand, reducedMotion, shuffle } from '../ui';
import { picture, plaque } from './reading';

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const heroArt = (id: string, size: number, cls = 'idle') => heroSVG(HEROES.find((x) => x.id === id)!, 'all', size, cls);
const motion = (ms: number) => (reducedMotion() ? Math.min(ms, 80) : ms);

/** the last help: the right answer shines */
async function shine(r: Round, el: Element | null | undefined): Promise<void> {
  if (!el || !r.open()) return;
  el.classList.add('hint');
  await r.say('Regarde celui qui brille !');
}

/** Number answers around `answer` (from `lo` to `hi`), as written plaques. */
function numberChoices(r: Round, answer: number, lo: number, hi: number, count: number, pick: (k: number, b: HTMLButtonElement) => void): HTMLButtonElement[] {
  const near = shuffle(range(lo, hi).filter((k) => k !== answer)).sort((a, b) => Math.abs(a - answer) - Math.abs(b - answer));
  const values = [answer, ...near.slice(0, count - 1)].sort((a, b) => a - b);
  const buttons = values.map((k) => {
    const b = plaque(String(k), 'big-number', String(k));
    b.dataset.n = String(k);
    b.onclick = () => {
      if (!r.open()) return;
      sfx.unlock();
      pick(k, b);
    };
    return b;
  });
  r.choices.classList.add('numbers', 'three-numbers');
  r.choices.append(...buttons);
  return buttons;
}
const numberButton = (r: Round, k: number) => r.choices.querySelector(`[data-n="${k}"]`);

/** « deux » for a number said alone (« zéro » has no clip alone, only « Zéro ! ») */
const numberWord = (k: number) => (k === 0 ? 'zéro !' : W[k]);

// ---------------------------------------------------------------- Bulle : les rimes
export function bulleGame(tier: number): Game {
  const count = [2, 3, 4][tier];
  let model: PicWord = RHYME_WORDS[0];
  let answer: PicWord = RHYME_WORDS[0];
  let prev: PicWord | undefined;
  let bubbles: { w: PicWord; el: HTMLButtonElement }[] = [];
  const question = () => `Écoute : ${model.word}. Quelle image finit comme : ${model.word} ?`;
  async function name(r: Round): Promise<void> {
    for (const b of bubbles) {
      if (!r.open()) break;
      b.el.classList.add('naming');
      await r.say(b.w.word);
      b.el.classList.remove('naming');
    }
  }
  return {
    rounds: 5,
    praise: ['Oui, ça rime !', 'Bravo, bien écouté !', 'Super oreille !'],
    setup(r) {
      model = pickWeighted(RHYME_WORDS, (w) => `jeu:bulle:${w.word}`, prev);
      prev = model;
      answer = rand(PIC_WORDS.filter((w) => w !== model && w.rime === model.rime));
      const last = (w: PicWord) => w.syl[w.syl.length - 1];
      const wrong: PicWord[] = [];
      for (const w of shuffle(PIC_WORDS.filter((w) => w.rime && w.rime !== model.rime && last(w) !== last(model))))
        if (wrong.length < count - 1 && !wrong.some((x) => x.rime === w.rime)) wrong.push(w);
      const card = h('button', { class: 'pic-card', 'aria-label': `${model.word} : réécouter` }, h('span', { 'aria-hidden': 'true' }, model.pic));
      card.onclick = () => void r.say(`Écoute : ${model.word}.`);
      r.stage.append(h('div', { class: 'bulle-row' }, h('span', { class: 'game-friend', html: heroArt('bulle', 72) }), card));
      r.choices.classList.add('bubbles');
      bubbles = shuffle([answer, ...wrong]).map((w, i) => {
        const el = h('button', { class: `soap tier-${tier}`, 'aria-label': w.word }, h('span', { class: 'glyph pic', 'aria-hidden': 'true' }, w.pic));
        el.style.animationDelay = `${-i * 0.9}s`;
        el.onclick = () => void pop(r, w, el);
        return { w, el };
      });
      r.choices.append(...bubbles.map((b) => b.el));
      r.bubble('Ça rime ?');
      return `jeu:bulle:${model.word}`;
    },
    async ask(r) {
      r.hold(true);
      await r.say(question());
      r.hold(false);
      // the last tier: the child names the pictures in their head
      if (tier < 2) await name(r);
    },
  };
  async function pop(r: Round, w: PicWord, el: HTMLButtonElement): Promise<void> {
    if (!r.open()) return;
    sfx.unlock();
    if (w === answer) {
      el.classList.add('popped');
      return r.win(el, async () => {
        r.bubble('Ça rime !');
        await r.say(`${model.word}… ${answer.word}…`);
        await r.say('Ça finit pareil !');
      });
    }
    r.miss(el);
    await r.say(`${model.word}… ${w.word}…`, { rate: 0.75 });
    if (r.misses === 1) await r.say('Ça ne finit pas pareil. Essaie encore !');
    else await shine(r, bubbles.find((b) => b.w === answer)?.el);
  }
}

// ---------------------------------------------------------------- Tao : les syllabes
const SYLLABLES = ['', 'Une syllabe !', 'Deux syllabes !', 'Trois syllabes !', 'Quatre syllabes !'];

export function taoGame(tier: number): Game {
  const words = CLAP_WORDS.filter((w) => w.syl.length <= [2, 3, 4][tier] && (tier === 0 || w.syl.length >= 2));
  const PLANKS = 5;
  let target: PicWord = words[0];
  let prev: PicWord | undefined;
  let planks: HTMLElement[] = [];
  let pile: HTMLButtonElement;
  let taps = 0;
  let seq = 0;
  let ready = false;
  const n = () => target.syl.length;
  /** the syllables said in one clip, a plank lighting with each (one syllable: the word alone) */
  async function syllables(r: Round, els: HTMLElement[]): Promise<void> {
    const on = (i: number) => {
      els[i]?.classList.add('on');
      sfx.drum();
    };
    if (n() === 1) {
      on(0);
      await r.say(`Écoute : ${target.word}.`);
    } else await r.say(`Écoute : ${target.syl.join('… ')}.`, { onMark: on, marks: n() });
  }
  function reset(): void {
    taps = 0;
    planks.forEach((p) => p.classList.remove('broken', 'on'));
  }
  return {
    rounds: 5,
    praise: ['Bravo, bien cassé !', 'Super, tu as bien écouté !', 'Oui, bravo !'],
    setup(r) {
      target = pickWeighted(words, (w) => `jeu:tao:${w.word}`, prev);
      prev = target;
      taps = 0;
      ready = false;
      const card = h('button', { class: 'pic-card', 'aria-label': `${target.word} : réécouter` }, h('span', { 'aria-hidden': 'true' }, target.pic));
      card.onclick = () => void r.say(`Écoute : ${target.word}.`);
      r.stage.append(h('div', { class: 'bulle-row' }, h('span', { class: 'game-friend', html: heroArt('tao', 72) }), card));
      planks = range(1, PLANKS).map(() => h('span', { class: 'plank' }));
      pile = h('button', { class: 'planks waiting', 'aria-label': 'Les planches : casser une planche' }, ...planks);
      pile.onclick = () => void chop(r);
      r.choices.append(pile);
      r.bubble('Une planche par syllabe !');
      return `jeu:tao:${target.word}`;
    },
    async ask(r) {
      ready = false;
      pile.classList.add('waiting');
      await r.say(`Écoute : ${target.word}. Casse une planche pour chaque syllabe !`);
      ready = true;
      pile.classList.remove('waiting');
    },
  };
  async function chop(r: Round): Promise<void> {
    if (!r.open() || !ready || taps >= PLANKS) return;
    sfx.unlock();
    sfx.drum();
    planks[taps].classList.add('broken');
    taps++;
    const my = ++seq;
    // the child stops (a young child thinks between two syllables): count the planks broken
    if (!(await r.wait(2200)) || my !== seq || !r.open()) return;
    const want = n();
    if (taps === want) {
      return r.win(pile, async () => {
        planks.forEach((p) => p.classList.remove('broken'));
        await syllables(r, planks);
        await r.say(`${wordLine(target.word)} ${SYLLABLES[want]}`);
      });
    }
    r.miss(pile);
    r.hold(true);
    await r.say(taps < want ? 'Il en manque !' : "C'est trop !");
    reset();
    if (r.misses === 1) {
      await syllables(r, planks);
      await r.wait(400);
      planks.forEach((p) => p.classList.remove('on'));
    } else {
      // the planks to break shine, as many as the syllables
      await syllables(r, planks);
      planks.forEach((p, i) => {
        p.classList.remove('on');
        p.classList.toggle('hint', i < want);
      });
      await r.say(SYLLABLES[want]);
      await r.say('Casse les planches qui brillent !');
    }
    r.hold(false);
  }
}

// ---------------------------------------------------------------- Pousse : les motifs
const FLOWERS = [
  { id: 'rouge', petal: '#e74c3c' },
  { id: 'jaune', petal: '#f7d038' },
  { id: 'bleu', petal: '#4a90e2' },
  { id: 'blanc', petal: '#f4f4f4' },
];
const flowerSVG = (petal: string) =>
  `<svg viewBox="0 0 10 12" shape-rendering="crispEdges" aria-hidden="true"><path d="M4 0h2v1h1v1h1v2h-1v1h-1v1h-2v-1h-1v-1h-1v-2h1v-1h1z" fill="${petal}" stroke="#2b2b2b" stroke-width=".3"/><rect x="4" y="2" width="2" height="2" fill="#f39c12"/><rect x="4.5" y="6" width="1" height="6" fill="#3fa34d"/><rect x="2" y="8" width="2.5" height="1" fill="#3fa34d"/><rect x="5.5" y="9" width="2.5" height="1" fill="#3fa34d"/></svg>`;
/** the patterns of each tier, as indexes into the chosen flowers */
const PATTERNS = [
  [[0, 1]],
  [
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 2],
  ],
  [
    [0, 0, 1, 1],
    [0, 1, 1],
    [0, 1, 2],
    [0, 0, 1],
  ],
];

export function pousseGame(tier: number): Game {
  let unit: number[] = [];
  let colours: typeof FLOWERS = [];
  let gaps: HTMLElement[] = [];
  let shown: HTMLElement[] = [];
  let answers: number[] = []; // the flower expected in each gap
  let filled = 0;
  let buttons: HTMLButtonElement[] = [];
  let prev: string | undefined;
  return {
    rounds: 5,
    noReview: true,
    praise: ['Oui, le motif continue !', 'Bravo, bien regardé !', 'Super !'],
    setup(r) {
      const key = pickWeighted(
        PATTERNS[tier].map((p) => p.join('')),
        (k) => `jeu:motif:${k}`,
        PATTERNS[tier].length > 1 ? prev : undefined,
      );
      prev = key;
      unit = [...key].map(Number);
      colours = shuffle([...FLOWERS]);
      const kinds = Math.max(...unit) + 1;
      // two whole units (or three short ones), then the gaps: one, two at the last tier
      const reps = unit.length === 2 ? 3 : 2;
      const seq = Array.from({ length: unit.length * reps + 2 }, (_, i) => unit[i % unit.length]);
      const holes = tier === 2 ? 2 : 1;
      const known = seq.slice(0, seq.length - 2);
      answers = seq.slice(known.length, known.length + holes);
      filled = 0;
      const row = h('div', { class: 'garden', role: 'img', 'aria-label': 'Le motif de fleurs' });
      shown = known.map((k) => h('span', { class: 'flower', html: flowerSVG(colours[k].petal) }));
      gaps = answers.map(() => h('span', { class: 'flower gap' }, '?'));
      row.append(...shown, ...gaps);
      r.stage.append(h('span', { class: 'game-friend', html: heroArt('pousse', 64) }), row);
      buttons = shuffle(range(0, Math.max(kinds, 3) - 1)).map((k) => {
        const b = h('button', { class: 'choice flower-btn', 'aria-label': `la fleur ${colours[k].id}` }, h('span', { class: 'flower', html: flowerSVG(colours[k].petal) }));
        b.dataset.k = String(k);
        b.onclick = () => void pick(r, k, b);
        return b;
      });
      r.choices.append(...buttons);
      r.bubble('?');
      return `jeu:motif:${key}`;
    },
    ask: (r) => r.say(filled ? 'Et après ?' : 'Quelle fleur vient après ?'),
  };
  async function pick(r: Round, k: number, b: HTMLButtonElement): Promise<void> {
    if (!r.open()) return;
    sfx.unlock();
    const want = answers[filled];
    if (k === want) {
      const gap = gaps[filled];
      gap.textContent = '';
      gap.innerHTML = flowerSVG(colours[k].petal);
      gap.classList.remove('gap');
      gap.classList.add('grow');
      buttons.forEach((x) => x.classList.remove('hint'));
      filled++;
      if (filled === answers.length) return r.win(gap);
      sfx.good();
      return r.say('Et après ?');
    }
    r.miss(b);
    if (r.misses === 1) {
      // the units light up one after the other: the pattern shows
      r.hold(true);
      const say = r.say('Regarde bien le motif en entier !');
      for (let i = 0; i < shown.length; i += unit.length) {
        const group = shown.slice(i, i + unit.length);
        group.forEach((f) => f.classList.add('on'));
        if (!(await r.wait(motion(650)))) break;
        group.forEach((f) => f.classList.remove('on'));
      }
      await say;
      r.hold(false);
    } else await shine(r, buttons.find((x) => x.dataset.k === String(want)));
  }
}

// ---------------------------------------------------------------- Luna : qu'est-ce qui a disparu ?
export function lunaGame(tier: number): Game {
  const count = [3, 4, 5][tier];
  let set: PicWord[] = [];
  let gone: PicWord = PIC_WORDS[0];
  let cards: HTMLElement[] = [];
  let options: { w: PicWord; el: HTMLButtonElement }[] = [];
  let hat: HTMLElement;
  let shownOnce = false;
  const pool = CLAP_WORDS; // their « Le chat ! » is recorded
  return {
    rounds: 5,
    noReview: true,
    praise: ['Bravo, quelle mémoire !', 'Oui, bien regardé !', 'Super !'],
    setup(r) {
      set = shuffle([...pool]).slice(0, count);
      gone = rand(set);
      shownOnce = false;
      cards = set.map((w) => h('span', { class: 'pic-card small', 'aria-label': w.word }, h('span', { 'aria-hidden': 'true' }, w.pic)));
      hat = h('div', { class: 'magic-table' }, ...cards, h('div', { class: 'magic-cloth', 'aria-hidden': 'true' }));
      r.stage.append(h('span', { class: 'game-friend', html: heroArt('luna', 64) }), hat);
      // the answers: what vanished, then (harder) things still there, and something never shown
      const stayed = shuffle(set.filter((w) => w !== gone)).slice(0, tier);
      const never = shuffle(pool.filter((w) => !set.includes(w))).slice(0, [3, 4, 4][tier] - 1 - tier);
      options = shuffle([gone, ...stayed, ...never]).map((w) => {
        const el = picture(w.pic, w.word);
        el.onclick = () => void pick(r, w, el);
        return { w, el };
      });
      r.choices.classList.add('kind-pic', 'luna-choices');
      r.choices.append(...options.map((o) => o.el));
      r.choices.classList.add('hidden-choices');
      r.bubble('Regarde bien !');
      return `jeu:luna:${count}`;
    },
    async ask(r) {
      if (shownOnce) return r.say("Qu'est-ce qui a disparu ?");
      r.hold(true);
      await r.say('Regarde bien !');
      // the first two tiers: Luna's things are named, one by one
      if (tier < 2)
        for (const c of cards) {
          c.classList.add('naming');
          await r.say(c.getAttribute('aria-label')!);
          c.classList.remove('naming');
        }
      if (!(await r.wait(motion([2500, 2500, 3000][tier])))) return;
      hat.classList.add('covered');
      sfx.chest();
      await r.say('Abracadabra !');
      if (!(await r.wait(motion(900)))) return;
      cards[set.indexOf(gone)].classList.add('vanished');
      hat.classList.remove('covered');
      r.choices.classList.remove('hidden-choices');
      shownOnce = true;
      r.bubble('?');
      r.hold(false);
      await r.say("Qu'est-ce qui a disparu ?");
    },
  };
  async function pick(r: Round, w: PicWord, el: HTMLButtonElement): Promise<void> {
    if (!r.open()) return;
    sfx.unlock();
    if (w === gone) {
      const card = cards[set.indexOf(gone)];
      card.classList.remove('vanished');
      card.classList.add('back');
      return r.win(el, () => r.say(wordLine(w.word)));
    }
    r.miss(el);
    if (r.misses === 1) {
      // still on the table: it shines there; never shown: said so
      const there = cards[set.indexOf(w)];
      await r.say(`${w.word}…`);
      if (there) {
        there.classList.add('naming');
        await r.say('Celui-là est encore là. Regarde bien !');
        there.classList.remove('naming');
      } else await r.say("Celui-là n'était pas là. Regarde bien !");
    } else await shine(r, options.find((o) => o.w === gone)?.el);
  }
}

// ---------------------------------------------------------------- Orageon : compter les coups de tonnerre
export function orageonGame(tier: number): Game {
  const [lo, hi] = [
    [1, 3],
    [2, 5],
    [3, 6],
  ][tier];
  let n = 0;
  let prev: number | undefined;
  let cloud: HTMLElement;
  /** the storm: a flash and a boom for each (the last tier: booms only, the cloud stays still) */
  async function storm(r: Round, counting = false): Promise<void> {
    r.hold(true);
    for (let i = 0; i < n; i++) {
      if (!(await r.wait(motion(i ? 300 : 600)))) return;
      if (tier < 2 || counting) {
        cloud.classList.remove('strike');
        void cloud.offsetWidth;
        cloud.classList.add('strike');
      }
      sfx.thunder();
      if (counting) await r.say(W[i + 1], { rate: 1 });
      else if (!(await r.wait(motion(700)))) return;
    }
    if (!(await r.wait(motion(500)))) return;
    r.hold(false);
  }
  return {
    rounds: 5,
    noReview: true,
    praise: ['Bravo, bien compté !', 'Oui, bien écouté !', 'Super oreille !'],
    setup(r) {
      n = pickWeighted(range(lo, hi), (k) => `jeu:tonnerre:${k}`, prev);
      prev = n;
      cloud = h('div', { class: `storm tier-${tier}`, html: heroArt('orageon', 140) });
      cloud.append(h('span', { class: 'bolt', 'aria-hidden': 'true' }, '⚡'));
      r.stage.append(cloud);
      numberChoices(r, n, 1, hi + 1, 3, (k, b) => void pick(r, k, b));
      r.bubble(tier === 2 ? 'Écoute bien !' : 'Regarde et écoute !');
      return `jeu:tonnerre:${n}`;
    },
    async ask(r) {
      await r.say('Compte les coups de tonnerre !');
      await storm(r);
      if (r.open()) await r.say('Combien de coups de tonnerre ?');
    },
    async repeat(r) {
      await storm(r);
      if (r.open()) await r.say('Combien de coups de tonnerre ?');
    },
  };
  async function pick(r: Round, k: number, b: HTMLButtonElement): Promise<void> {
    if (k === n) return r.win(b, () => r.say(`${W[n]} !`.replace(/^./, (c) => c.toUpperCase())));
    r.miss(b);
    if (r.misses === 1) {
      await r.say(`Ça, c'est le nombre ${W[k]}.`);
      if (!r.open()) return;
      await r.say('On compte ensemble !');
      await storm(r, true);
      if (r.open()) await r.say('Combien de coups de tonnerre ?');
    } else await shine(r, numberButton(r, n));
  }
}

// ---------------------------------------------------------------- Robo : la pièce différente
type Shape = 'rond' | 'carre' | 'triangle' | 'etoile';
const SHAPES: Shape[] = ['rond', 'carre', 'triangle', 'etoile'];
const SHAPE_PATH: Record<Shape, string> = {
  rond: '<circle cx="10" cy="10" r="8"/>',
  carre: '<rect x="2.5" y="2.5" width="15" height="15"/>',
  triangle: '<path d="M10 2 18 17H2z"/>',
  etoile: '<path d="M10 1.5l2.6 5.6 6 .7-4.5 4.1 1.2 6-5.3-3-5.3 3 1.2-6L1.4 7.8l6-.7z"/>',
};
const PIECE_COLOURS = ['#e74c3c', '#4a90e2', '#f7d038', '#3fa34d', '#9b59b6'];
const pieceSVG = (s: Shape, c: string) => `<svg viewBox="0 0 20 20" aria-hidden="true"><g fill="${c}" stroke="#2b2b2b" stroke-width="1.4" stroke-linejoin="round">${SHAPE_PATH[s]}</g></svg>`;

export function roboGame(tier: number): Game {
  const count = [3, 4, 5][tier];
  /** what makes the odd piece different: its colour (1st tier), its shape (then), either (last) */
  let by: 'couleur' | 'forme' = 'couleur';
  let odd = 0;
  let buttons: HTMLButtonElement[] = [];
  let prev: 'couleur' | 'forme' | undefined;
  return {
    rounds: 5,
    noReview: true,
    praise: ['Bravo, bien trié !', 'Oui, bien regardé !', 'Bip bip, bravo !'],
    setup(r) {
      by = tier === 0 ? 'couleur' : tier === 1 ? 'forme' : pickWeighted(['couleur', 'forme'] as const, (k) => `jeu:robo:${k}`, prev);
      prev = by;
      const [shape, other] = shuffle([...SHAPES]);
      const [colour, otherColour] = shuffle([...PIECE_COLOURS]);
      odd = Math.floor(Math.random() * count);
      // the last tier: the other property varies too, so only one property tells the odd piece
      // (colours all different; or two shapes, each at least twice, so no piece stands out by shape)
      const mixed = shuffle([...PIECE_COLOURS]);
      const two = shuffle([...SHAPES]).slice(0, 2);
      const others = shuffle([two[0], two[0], two[1], two[1]]);
      let o = 0;
      buttons = range(0, count - 1).map((i) => {
        let s = shape;
        let c = colour;
        if (by === 'couleur') {
          if (i === odd) c = otherColour;
          if (tier === 2) s = i === odd ? two[0] : others[o++];
        } else {
          if (i === odd) s = other;
          if (tier === 2) c = mixed[i];
        }
        const b = h('button', { class: 'choice piece', 'aria-label': `pièce ${i + 1}` }, h('span', { class: 'glyph', html: pieceSVG(s, c) }));
        b.onclick = () => void pick(r, i, b);
        return b;
      });
      r.stage.append(h('div', { class: 'robo-belt' }, h('span', { class: 'game-friend', html: heroArt('robo', 96) })));
      r.choices.classList.add('robo-pieces');
      r.choices.append(...buttons);
      r.bubble('?');
      return `jeu:robo:${by}`;
    },
    ask: (r) => r.say('Une pièce est différente. Laquelle ?'),
  };
  async function pick(r: Round, i: number, b: HTMLButtonElement): Promise<void> {
    if (!r.open()) return;
    sfx.unlock();
    if (i === odd) return r.win(b, () => r.say(by === 'couleur' ? "Elle n'a pas la même couleur !" : "Elle n'a pas la même forme !"));
    r.miss(b);
    if (r.misses === 1) await r.say(by === 'couleur' ? 'Regarde bien les couleurs !' : 'Regarde bien les formes !');
    else await shine(r, buttons[odd]);
  }
}

// ---------------------------------------------------------------- Glaçon : combien en reste-t-il ?
const ICE = '<svg viewBox="0 0 10 10" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="1" width="8" height="8" fill="#a8dcf5" stroke="#2b2b2b" stroke-width=".6"/><rect x="2" y="2" width="3" height="1" fill="#fff"/><rect x="2" y="3" width="1" height="2" fill="#fff"/></svg>';

export function glaconGame(tier: number): Game {
  const [lo, hi, maxMelt] = [
    [3, 5, 1],
    [4, 7, 3],
    [4, 8, 4],
  ][tier];
  let n = 0;
  let melt = 0;
  let prev: string | undefined;
  let cubes: HTMLElement[] = [];
  let snow: HTMLElement;
  const left = () => n - melt;
  return {
    rounds: 5,
    noReview: true,
    praise: ['Bravo, bien compté !', 'Oui, bien calculé !', 'Super !'],
    setup(r) {
      const options = range(lo, hi).flatMap((a) => range(1, Math.min(maxMelt, a - 1)).map((b) => `${a}-${b}`));
      const key = pickWeighted(options, (k) => `jeu:glacon:${k}`, prev);
      prev = key;
      [n, melt] = key.split('-').map(Number);
      cubes = range(1, n).map(() => h('span', { class: 'ice', html: ICE }));
      // the cubes that melt are the last ones; at the last tier the others hide under the snow
      snow = h('div', { class: 'snow-hill', 'aria-hidden': 'true' });
      const tray = h('div', { class: 'ice-tray', role: 'img', 'aria-label': 'Les glaçons' }, ...cubes);
      r.stage.append(h('span', { class: 'game-friend', html: heroArt('glacon', 64) }), h('div', { class: 'ice-scene' }, tray, snow));
      numberChoices(r, left(), 0, hi, 3, (k, b) => void pick(r, k, b));
      r.choices.classList.add('hidden-choices');
      r.bubble('Regarde !');
      return `jeu:glacon:${key}`;
    },
    async ask(r) {
      if (cubes.some((c) => c.classList.contains('melted'))) return r.say(question());
      r.hold(true);
      await r.say('Regarde les glaçons !');
      if (!(await r.wait(motion(tier === 2 ? 1800 : 1000)))) return;
      if (tier === 2) {
        // the cubes that stay go under the snow, the others slide out and melt in the sun
        snow.classList.add('up');
        cubes.slice(0, left()).forEach((c) => c.classList.add('hidden'));
        if (!(await r.wait(motion(900)))) return;
      }
      for (const c of cubes.slice(left())) {
        c.classList.add('melted');
        sfx.drip();
        if (!(await r.wait(motion(700)))) return;
      }
      r.choices.classList.remove('hidden-choices');
      r.bubble('?');
      r.hold(false);
      await r.say(question());
    },
  };
  function question(): string {
    return tier === 2 ? 'Combien de glaçons sous la neige ?' : 'Combien de glaçons restent ?';
  }
  async function pick(r: Round, k: number, b: HTMLButtonElement): Promise<void> {
    if (k === left()) {
      snow.classList.remove('up');
      cubes.forEach((c) => c.classList.remove('hidden'));
      return r.win(b, () => r.say(left() === 0 ? 'Zéro !' : `${W[left()].replace(/^./, (c) => c.toUpperCase())} !`));
    }
    r.miss(b);
    if (r.misses === 1) {
      if (k) await r.say(`Ça, c'est le nombre ${W[k]}.`);
      // the snow lifts: count the cubes still there together
      snow.classList.remove('up');
      cubes.forEach((c) => c.classList.remove('hidden'));
      const still = cubes.slice(0, left());
      if (!still.length || !r.open()) return;
      r.hold(true);
      await r.say('On compte ensemble !');
      for (let i = 0; i < still.length; i++) {
        still[i].classList.add('glow');
        await r.say(W[i + 1], { rate: 1 });
      }
      r.hold(false);
    } else await shine(r, numberButton(r, left()));
  }
}

// ---------------------------------------------------------------- Brume : sur, sous, à côté…
type Place = 'sur' | 'sous' | 'cote' | 'devant' | 'derriere';
const PLACE_WORDS: Record<Place, string> = { sur: 'sur la table', sous: 'sous la table', cote: 'à côté de la table', devant: 'devant la table', derriere: 'derrière la table' };
export const BRUME_PLACES = PLACE_WORDS;
const TABLE =
  '<svg viewBox="0 0 40 24" shape-rendering="crispEdges" aria-hidden="true"><rect x="1" y="4" width="38" height="4" fill="#a0673a" stroke="#2b2b2b" stroke-width=".8"/><rect x="4" y="8" width="3" height="16" fill="#7a4a24" stroke="#2b2b2b" stroke-width=".8"/><rect x="33" y="8" width="3" height="16" fill="#7a4a24" stroke="#2b2b2b" stroke-width=".8"/></svg>';

export function brumeGame(tier: number): Game {
  const places: Place[][] = [
    ['sur', 'sous'],
    ['sur', 'sous', 'cote'],
    ['sur', 'sous', 'cote', 'devant', 'derriere'],
  ];
  const offered = places[tier];
  let want: Place = 'sur';
  let prev: Place | undefined;
  let spots: Partial<Record<Place, HTMLButtonElement>> = {};
  let ghost: HTMLElement;
  return {
    rounds: 5,
    noReview: true,
    praise: ['Bravo, bien caché !', 'Hou hou, bravo !', 'Oui, bien écouté !'],
    setup(r) {
      want = pickWeighted(offered, (p) => `jeu:brume:${p}`, prev);
      prev = want;
      const room = h('div', { class: `room tier-${tier}` }, h('div', { class: 'table', html: TABLE }));
      ghost = h('span', { class: 'ghost', html: heroArt('brume', 56) });
      spots = {};
      for (const p of offered) {
        const b = h('button', { class: `spot spot-${p}`, 'aria-label': PLACE_WORDS[p] });
        b.onclick = () => void put(r, p, b);
        spots[p] = b;
        room.append(b);
      }
      // Brume waits beside the room until the child hides it
      room.append(h('span', { class: 'spot spot-start', 'aria-hidden': 'true' }, ghost));
      r.stage.append(room);
      r.stage.classList.add('room-stage');
      r.bubble('Hou hou !');
      return `jeu:brume:${want}`;
    },
    ask: (r) => r.say(`Cache Brume ${PLACE_WORDS[want]} !`),
  };
  async function put(r: Round, p: Place, b: HTMLButtonElement): Promise<void> {
    if (!r.open()) return;
    sfx.unlock();
    b.append(ghost);
    sfx.hop();
    if (p === want) return r.win(b);
    r.miss(b);
    if (r.misses === 1) await r.say(`Ça, c'est ${PLACE_WORDS[p]}. Cache Brume ${PLACE_WORDS[want]} !`);
    else await shine(r, spots[want]);
  }
}

// ---------------------------------------------------------------- Astro : le compte à rebours
export function astroGame(tier: number): Game {
  const from = tier === 0 ? 5 : 10;
  const holes = tier === 2 ? 2 : 1;
  let missing: number[] = [];
  let filled = 0;
  let slots: HTMLElement[] = [];
  let rocket: HTMLElement;
  let prev: number | undefined;
  /** Pixel counts down to the next gap, each number lighting up */
  async function countdown(r: Round): Promise<void> {
    r.hold(true);
    const stop = missing[filled];
    for (let k = from; k > stop; k--) {
      const s = slots[from - k];
      s.classList.add('on');
      await r.say(numberWord(k), { rate: 1 });
      s.classList.remove('on');
      if (!(await r.wait(0))) return;
    }
    slots[from - stop].classList.add('on');
    r.hold(false);
    await r.say('Et après ?');
  }
  return {
    rounds: 5,
    noReview: true,
    praise: ['Bravo !', 'Super, bien compté !', 'Oui, bravo !'],
    setup(r) {
      // the gap is never the first number: the countdown needs a start
      const first = pickWeighted(range(0, from - 1 - (holes - 1) * 2), (k) => `jeu:fusee:${from}:${k}`, prev);
      prev = first;
      missing = holes === 2 ? [first + 2, first] : [first];
      missing.sort((a, b) => b - a);
      filled = 0;
      slots = range(0, from).map((i) => {
        const k = from - i;
        return h('span', { class: `count-slot${missing.includes(k) ? ' gap' : ''}` }, missing.includes(k) ? '?' : String(k));
      });
      rocket = h('div', { class: 'rocket' }, h('span', { class: 'game-friend', html: heroArt('astro', 56) }), h('span', { class: 'rocket-ship', 'aria-hidden': 'true' }, '🚀'));
      r.stage.append(h('div', { class: 'launch' }, h('div', { class: 'countdown' }, ...slots), rocket));
      numberChoices(r, missing[0], 0, from, 3, (k, b) => void pick(r, k, b));
      r.bubble('?');
      return `jeu:fusee:${from}:${first}`;
    },
    async ask(r) {
      await r.say('Quel nombre manque ?');
      if (r.open()) await countdown(r);
    },
    repeat: (r) => countdown(r),
  };
  async function pick(r: Round, k: number, b: HTMLButtonElement): Promise<void> {
    const want = missing[filled];
    if (k === want) {
      const s = slots[from - want];
      s.textContent = String(want);
      s.classList.remove('gap', 'on');
      s.classList.add('found');
      filled++;
      if (filled < missing.length) {
        sfx.good();
        // the choices again, around the next gap
        r.choices.replaceChildren();
        numberChoices(r, missing[filled], 0, from, 3, (x, y) => void pick(r, x, y));
        return countdown(r);
      }
      return r.win(b, async () => {
        rocket.classList.add('lift');
        await r.say('Décollage !');
      });
    }
    r.miss(b);
    if (r.misses === 1) {
      if (k) await r.say(`Ça, c'est le nombre ${W[k]}.`);
      if (r.open()) await r.say('On compte ensemble !');
      if (r.open()) await countdown(r);
    } else await shine(r, numberButton(r, want));
  }
}
