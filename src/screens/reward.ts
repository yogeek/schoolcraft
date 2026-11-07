import { say, sfx } from '../audio';
import { foxSVG } from '../pixel';
import type { BlockType } from '../state';
import { blockImg, h, topBar } from '../ui';
import type { Ctx, ScreenName } from './types';

/** End-of-session screen: show the blocks won, then propose to build or replay. */
export function rewardScreen(ctx: Ctx, won: BlockType[], replay: ScreenName): void {
  sfx.fanfare();
  const n = won.length;
  void say(n > 0 ? `Bravo ! Tu as gagné ${n} bloc${n > 1 ? 's' : ''} ! Tu veux construire ?` : 'Bien joué ! On recommence ?');

  const loot = h('div', { class: 'loot' });
  won.forEach((t, i) => {
    const b = blockImg(t);
    b.style.animationDelay = `${i * 120}ms`;
    loot.append(b);
  });

  const build = h('button', { class: 'btn big green' }, blockImg('wood', 'block mini'), 'Construire');
  build.onclick = () => ctx.go('build');
  const again = h('button', { class: 'btn big' }, 'Rejouer');
  again.onclick = () => ctx.go(replay);

  ctx.root.append(
    h(
      'main',
      { class: 'screen reward' },
      topBar(() => ctx.go('home')),
      h('div', { class: 'hero' }, h('div', { class: 'fox-btn jump', html: foxSVG(140) }), h('div', { class: 'bubble' }, 'Bravo !')),
      loot,
      h('div', { class: 'actions' }, build, again),
    ),
  );
}
