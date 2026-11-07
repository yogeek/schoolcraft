import { say, sfx } from '../audio';
import type { SessionResult } from '../levels';
import { foxSVG } from '../pixel';
import type { BlockType } from '../state';
import { blockImg, h, topBar } from '../ui';
import type { Ctx, ScreenName } from './types';

/** End-of-session screen: blocks won, level reached, then build / next level / replay. */
export function rewardScreen(ctx: Ctx, won: BlockType[], replay: ScreenName, result: SessionResult): void {
  sfx.fanfare();
  const n = won.length;
  const blocks = `Tu as gagné ${n} bloc${n > 1 ? 's' : ''} !`;
  let title = 'Bravo !';
  let speech: string;
  if (result.next && result.isNew) {
    title = `Niveau ${result.next} débloqué !`;
    speech = `Bravo ! ${blocks} Et tu passes au niveau ${result.next} !`;
  } else if (result.next) {
    title = `Niveau ${result.next} !`;
    speech = `Bravo ! ${blocks} On passe au niveau ${result.next}.`;
  } else if (result.passed) {
    speech = `Bravo ! ${blocks} Tu as réussi le dernier niveau, champion !`;
  } else {
    title = 'Bien joué !';
    speech = `Bien joué ! ${blocks} Encore un peu d'entraînement et tu passeras au niveau suivant !`;
  }
  void say(speech);

  const loot = h('div', { class: 'loot' });
  won.forEach((t, i) => {
    const b = blockImg(t);
    b.style.animationDelay = `${i * 120}ms`;
    loot.append(b);
  });

  const stars = h('div', { class: 'stars', 'aria-label': `${result.firstTry} sur ${result.rounds} du premier coup` });
  for (let i = 0; i < result.rounds; i++) stars.append(h('span', { class: i < result.firstTry ? 'on' : '' }, '★'));

  const build = h('button', { class: 'btn big green' }, blockImg('wood', 'block mini'), 'Construire');
  build.onclick = () => ctx.go('build');
  const again = h('button', { class: 'btn big' }, result.next ? 'Niveau suivant' : 'Rejouer');
  again.onclick = () => ctx.go(replay);

  window.scrollTo(0, 0);
  ctx.root.replaceChildren(
    h(
      'main',
      { class: 'screen reward' },
      topBar(() => ctx.go('home')),
      h('div', { class: 'hero' }, h('div', { class: 'fox-btn jump', html: foxSVG(140) }), h('div', { class: 'bubble' }, title)),
      stars,
      loot,
      h('div', { class: 'actions' }, again, build),
    ),
  );
}
