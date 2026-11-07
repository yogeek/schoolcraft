// Activité « Compter » : 6 niveaux (contenu : src/content/counting.ts).
// 1–3 : toucher chaque bloc pour le compter (la voix dit « un, deux… ») puis choisir le nombre.
// 4   : coup d'œil — les blocs (rangés comme sur un dé) se cachent après 2 secondes.
// 5–6 : additions avec deux tas de blocs.
import { sfx } from '../audio';
import { COUNT_LEVELS, DICE, NUMBER_WORDS as WORDS } from '../content/counting';
import { currentLevel, endSession } from '../levels';
import { BLOCK_TYPES, pickWeighted, record, type BlockType } from '../state';
import { blockImg, bubble, setBubble, giveBlock, h, levelButton, mascot, rand, rewardType, shuffle, speakerButton, topBar } from '../ui';
import { rewardScreen } from './reward';
import type { Ctx } from './types';

const FLASH_MS = 2000;
const ROUNDS = 5;

export function countScreen(ctx: Ctx): void {
  const levelNo = currentLevel('count');
  const level = COUNT_LEVELS[levelNo - 1];
  const pool = Array.from({ length: level.max - level.min + 1 }, (_, i) => level.min + i);
  const statKey = (n: number) => `count:${level.mode}:${n}`;
  let round = 0;
  let firstTry = 0;
  let missed = false;
  let streak = 0;
  let target = 0;
  let a = 0; // first term of an addition
  let counted = 0;
  let locked = true; // true while there is no question to answer
  let seq = 0; // question number
  let flashSeq = 0; // the latest "show then hide" run; older runs stop
  let asked = false;
  const won: BlockType[] = [];

  const progress = h('div', { class: 'progress', 'aria-label': `${ROUNDS} questions` });
  for (let i = 0; i < ROUNDS; i++) progress.append(h('span'));
  const bub = bubble();
  const pile = h('div', { class: 'pile' });
  const answers = h('div', { class: 'choices numbers' });
  const repeat = () => {
    if (!locked) void (level.mode === 'flash' ? flash() : ask());
  };

  ctx.root.append(
    h(
      'main',
      { class: 'screen activity' },
      topBar(() => ctx.go('home'), levelButton('count', levelNo, () => ctx.go('count'))),
      progress,
      h('div', { class: 'hero small' }, mascot(90, repeat), bub, speakerButton(repeat)),
      pile,
      answers,
      h('div', { class: 'ground' }),
    ),
  );

  function ask(): Promise<void> {
    asked = true;
    if (level.mode === 'add') {
      setBubble(bub, `${a} + ${target - a} = ?`);
      return ctx.say(`Combien font : ${WORDS[a]}… plus… ${WORDS[target - a]} ?`);
    }
    setBubble(bub, 'Combien de blocs ?');
    if (level.mode === 'flash') return ctx.say('Combien y avait-il de blocs ?');
    return ctx.say(counted === 0 ? 'Combien y a-t-il de blocs ? Touche-les pour les compter !' : 'Combien y a-t-il de blocs ?');
  }

  /** Show the blocks for a moment, then hide them and ask. */
  async function flash(): Promise<void> {
    asked = true;
    const my = ++flashSeq;
    pile.classList.remove('covered');
    setBubble(bub, 'Regarde bien !');
    await ctx.say('Regarde bien !');
    if (!(await ctx.wait(FLASH_MS)) || my !== flashSeq || locked) return;
    pile.classList.add('covered');
    await ask();
  }

  function pileBlock(type: BlockType): HTMLElement {
    if (level.mode === 'flash') return h('div', { class: 'pile-block', 'aria-hidden': 'true' }, blockImg(type));
    const b = h('button', { class: 'pile-block', 'aria-label': 'bloc' }, blockImg(type));
    b.onclick = () => countBlock(b);
    return b;
  }

  /** Show a new question (without speaking it). */
  function setupRound(): void {
    locked = false;
    missed = false;
    counted = 0;
    asked = false;
    seq++;
    flashSeq++;
    target = pickWeighted(pool, statKey, round > 0 ? target : undefined);
    const type = rand(BLOCK_TYPES.filter((t) => t !== 'glass'));
    pile.replaceChildren();
    pile.className = 'pile';

    if (level.mode === 'add') {
      a = 1 + Math.floor(Math.random() * (target - 1));
      const typeB = rand(BLOCK_TYPES.filter((t) => t !== 'glass' && t !== type));
      const groupA = h('div', { class: 'group' });
      const groupB = h('div', { class: 'group' });
      for (let i = 0; i < a; i++) groupA.append(pileBlock(type));
      for (let i = 0; i < target - a; i++) groupB.append(pileBlock(typeB));
      pile.classList.add('sum');
      pile.append(groupA, h('div', { class: 'plus', 'aria-hidden': 'true' }, '+'), groupB);
      setBubble(bub, `${a} + ${target - a} = ?`);
    } else if (level.mode === 'flash') {
      pile.classList.add('dice', 'covered'); // hidden until "Regarde bien !"
      const cells = DICE[target];
      for (let i = 0; i < 9; i++) pile.append(cells.includes(i) ? pileBlock(type) : h('span'));
      setBubble(bub, 'Regarde bien !');
    } else {
      for (let i = 0; i < target; i++) pile.append(pileBlock(type));
      setBubble(bub, 'Combien de blocs ?');
    }

    // wrong answers stay within the level's range (no "7" when counting up to 4)
    const options = new Set<number>([target]);
    const hi = Math.min(level.max, target + 3);
    const lo = Math.max(1, Math.min(target - 3, hi - level.choices + 1));
    for (let guard = 0; options.size < level.choices && guard < 200; guard++) options.add(lo + Math.floor(Math.random() * (hi - lo + 1)));
    answers.replaceChildren(...shuffle([...options]).map(makeAnswer));
  }

  function nextRound(): void {
    if (round >= ROUNDS) {
      locked = true;
      return rewardScreen(ctx, won, 'count', endSession('count', firstTry, ROUNDS));
    }
    setupRound();
    void (level.mode === 'flash' ? flash() : ask());
  }

  function countBlock(b: HTMLElement): void {
    if (locked || b.classList.contains('counted')) return;
    sfx.tap();
    counted++;
    b.classList.add('counted');
    b.dataset.n = String(counted);
    void ctx.say(WORDS[counted] ?? String(counted), { rate: 1 });
  }

  function makeAnswer(n: number): HTMLElement {
    const label = String(n);
    const b = h('button', { class: 'choice', 'aria-label': label }, blockImg('plaque'), h('span', { class: `glyph len${label.length}` }, label));
    b.onclick = () => void pick(n, b);
    return b;
  }

  const same = (my: number) => my === seq && !locked;

  async function pick(n: number, el: HTMLElement): Promise<void> {
    if (locked) return;
    sfx.unlock();
    if (n === target) {
      locked = true;
      flashSeq++; // stop a pending "hide"
      if (!missed) {
        record(statKey(target), true);
        firstTry++;
      }
      streak++;
      sfx.good();
      el.classList.add('good');
      pile.classList.remove('covered');
      const t = rewardType(streak);
      won.push(t);
      giveBlock(t, el);
      progress.children[round]?.classList.add('done');
      round++;
      if (level.mode === 'add') {
        setBubble(bub, `${a} + ${target - a} = ${target}`);
        await ctx.say('Oui !');
        await ctx.say(`${WORDS[a]}… plus… ${WORDS[target - a]}… ça fait : ${WORDS[target]} !`);
      } else {
        setBubble(bub, `Oui, ${target} !`);
        await ctx.say(`Oui ! Il y a ${WORDS[target]} bloc${target > 1 ? 's' : ''} !`);
      }
      if (await ctx.wait(300)) nextRound();
      return;
    }
    if (!missed) record(statKey(target), false); // a question counts as missed once
    missed = true;
    streak = 0;
    sfx.oops();
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setBubble(bub, 'Essaie encore !');
    const my = seq;
    if (level.mode === 'flash') {
      await ctx.say(`Ça, c'est le nombre ${WORDS[n]}. Regarde encore !`);
      if (same(my)) await flash();
      return;
    }
    // help: reset the counting so the child can count again, one by one
    pile.querySelectorAll('.counted').forEach((b) => b.classList.remove('counted'));
    counted = 0;
    await ctx.say(`Ça, c'est le nombre ${WORDS[n]}. Compte ${level.mode === 'add' ? 'tous ' : ''}les blocs avec ton doigt !`);
  }

  // the first question is visible right away; it is asked once the level is introduced
  setupRound();
  const first = seq;
  void ctx.say(`Niveau ${levelNo}. ${level.intro}`).then(async () => {
    if (!(await ctx.wait(150)) || first !== seq || locked || missed || asked) return;
    void (level.mode === 'flash' ? flash() : ask());
  });
}
