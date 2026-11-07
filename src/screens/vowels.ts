// Activité « Trouve le son » : la voix dit un son de voyelle, l'enfant touche le bon bloc.
import { say, sfx } from '../audio';
import { foxSVG } from '../pixel';
import { pickWeighted, record, type BlockType } from '../state';
import { blockImg, giveBlock, h, rand, rewardType, shuffle, SPEAKER_SVG, topBar, wait } from '../ui';
import { rewardScreen } from './reward';
import type { Ctx } from './types';

const VOWELS = ['a', 'i', 'o', 'u', 'e', 'é'] as const;
type Vowel = (typeof VOWELS)[number];

/** How the voice pronounces each sound (spelled so speech engines say the sound, not the letter name). */
const SPOKEN: Record<Vowel, string> = { a: 'a', i: 'i', o: 'o', u: 'u', e: 'eu', é: 'é' };
/** A word to anchor each sound. */
const EXAMPLE: Record<Vowel, string> = { a: 'comme dans ananas', i: 'comme dans souris', o: 'comme dans moto', u: 'comme dans tortue', e: 'comme dans cheval', é: 'comme dans école' };

const ROUNDS = 6;
const PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Oui, bien joué !', 'Tu es trop fort !', 'Excellent !'];

export function vowelsScreen(ctx: Ctx): void {
  let round = 0;
  let streak = 0;
  let target: Vowel = 'a';
  let locked = false;
  const won: BlockType[] = [];

  const progress = h('div', { class: 'progress' });
  for (let i = 0; i < ROUNDS; i++) progress.append(h('span'));
  const bubble = h('div', { class: 'bubble' }, '');
  const choices = h('div', { class: 'choices' });
  const replay = h('button', { class: 'btn-icon speaker', 'aria-label': 'Réécouter', html: SPEAKER_SVG });
  replay.onclick = () => ask();

  ctx.root.append(
    h(
      'main',
      { class: 'screen activity' },
      topBar(() => ctx.go('home'), 'Les sons'),
      progress,
      h('div', { class: 'hero small' }, h('div', { class: 'fox-btn', html: foxSVG(90) }), bubble, replay),
      choices,
      h('div', { class: 'ground' }),
    ),
  );

  function ask(): Promise<void> {
    bubble.textContent = `Touche « ${target} »`;
    return say(`Touche le bloc qui fait… ${SPOKEN[target]} !`);
  }

  function nextRound(): void {
    if (round >= ROUNDS) return rewardScreen(ctx, won, 'vowels');
    locked = false;
    target = pickWeighted(VOWELS, round > 0 ? target : undefined);
    const nChoices = round < 2 ? 3 : 4;
    const others = shuffle(VOWELS.filter((v) => v !== target)).slice(0, nChoices - 1);
    choices.replaceChildren(...shuffle([target, ...others]).map(makeChoice));
    void ask();
  }

  function makeChoice(v: Vowel): HTMLElement {
    const b = h('button', { class: 'choice', 'aria-label': v }, blockImg('plaque'), h('span', { class: 'glyph' }, v));
    b.onclick = () => void pick(v, b);
    return b;
  }

  async function pick(v: Vowel, el: HTMLElement): Promise<void> {
    if (locked) return;
    sfx.unlock();
    if (v === target) {
      locked = true;
      record(`vowel:${target}`, true);
      streak++;
      sfx.good();
      el.classList.add('good');
      const t = rewardType(streak);
      won.push(t);
      giveBlock(t, el);
      progress.children[round]?.classList.add('done');
      round++;
      bubble.textContent = rand(PRAISE);
      await say(`${bubble.textContent} ${SPOKEN[target]}, ${EXAMPLE[target]}.`);
      await wait(250);
      nextRound();
    } else {
      record(`vowel:${target}`, false);
      streak = 0;
      sfx.oops();
      el.classList.remove('shake');
      void el.offsetWidth; // restart the CSS animation
      el.classList.add('shake');
      bubble.textContent = 'Essaie encore !';
      await say(`Ça, c'est ${SPOKEN[v]}. Essaie encore ! Cherche… ${SPOKEN[target]}.`);
    }
  }

  void say('On joue avec les sons ! Écoute bien.').then(() => wait(200)).then(nextRound);
}
