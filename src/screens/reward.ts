// End-of-session screen: blocks won, level reached, then colour a hero / next level / replay.
import { sfx } from '../audio';
import { heroSVG } from '../heroArt';
import type { SessionResult } from '../levels';
import { beginScreen } from '../nav';
import { state, type BlockType } from '../state';
import { blockImg, bubble, h, mascot, topBar } from '../ui';
import { currentHero } from './heroes';
import type { Ctx, ScreenName } from './types';

export function rewardScreen(prev: Ctx, won: BlockType[], replay: ScreenName, result: SessionResult): void {
  // a new screen: the activity's pending speech and timers stop here
  const ctx: Ctx = { go: prev.go, root: prev.root, ...beginScreen(prev.root) };
  sfx.fanfare();
  const n = won.length;
  const blocks = `Tu as gagné ${n} bloc${n > 1 ? 's' : ''} !`;
  const hero = currentHero();
  // never "ton héros" / "tes héros" in speech: voices sometimes glue the words (« tes-z-héros »)
  const invite = hero ? 'Tu veux colorier un ami ?' : 'Tu peux construire ta maison !';
  let title = 'Bravo !';
  let speech: string;
  if (result.next && result.isNew) {
    title = `Niveau ${result.next} débloqué !`;
    speech = `Bravo ! ${blocks} Et tu passes au niveau ${result.next} ! ${invite}`;
  } else if (result.next) {
    title = `Niveau ${result.next} !`;
    speech = `Bravo ! ${blocks} On passe au niveau ${result.next}. ${invite}`;
  } else if (result.passed) {
    speech = `Bravo ! ${blocks} Tu as réussi le dernier niveau ! Quel talent ! ${invite}`;
  } else {
    title = 'Bien joué !';
    speech = `Bien joué ! ${blocks} Encore un peu d'entraînement et tu passeras au niveau suivant ! ${invite}`;
  }
  void ctx.say(speech);

  const loot = h('div', { class: 'loot', 'aria-label': blocks });
  won.forEach((t, i) => {
    const b = blockImg(t);
    b.style.animationDelay = `${i * 120}ms`;
    loot.append(b);
  });

  const stars = h('div', { class: 'stars', role: 'img', 'aria-label': `${result.firstTry} sur ${result.rounds} du premier coup` });
  for (let i = 0; i < result.rounds; i++) stars.append(h('span', { class: i < result.firstTry ? 'on' : '' }, '★'));

  const again = h('button', { class: 'btn big' }, result.next ? 'Niveau suivant' : 'Rejouer');
  again.onclick = () => ctx.go(replay);
  const next = hero
    ? h('button', { class: 'btn big green' }, h('span', { class: 'btn-hero', html: heroSVG(hero, new Set(state.heroes.filled[hero.id] ?? []), 34) }), 'Colorier')
    : h('button', { class: 'btn big green' }, blockImg('wood', 'block mini'), 'Ma maison');
  next.onclick = () => ctx.go(hero ? 'color' : 'build');

  ctx.root.append(
    h(
      'main',
      { class: 'screen reward' },
      topBar(() => ctx.go('home')),
      h('div', { class: 'hero' }, mascot(140, () => void ctx.say(speech)), bubble(title)),
      stars,
      loot,
      h('div', { class: 'actions' }, next, again),
    ),
  );
}
