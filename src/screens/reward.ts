// End-of-session screen: stars, blocks won, level reached, then: go on with today's adventure (or
// open its chest), colour a hero, next level / replay.
import { sfx } from '../audio';
import { heroSVG } from '../heroArt';
import type { SessionResult } from '../levels';
import { beginScreen } from '../nav';
import { state, type ActivityId, type BlockType } from '../state';
import { blockImg, bubble, h, mascot, topBar } from '../ui';
import { chestReady, missionStrip, nextInMission, openChest } from './chest';
import { currentHero } from './heroes';
import type { Ctx } from './types';

const VERB: Record<ActivityId, string> = { sounds: 'lire', write: 'écrire', count: 'compter' };

export function rewardScreen(prev: Ctx, won: BlockType[], replay: ActivityId, result: SessionResult): void {
  // a new screen: the activity's pending speech and timers stop here
  const ctx: Ctx = { go: prev.go, root: prev.root, ...beginScreen(prev.root) };
  sfx.fanfare();
  const n = won.length;
  const blocks = `Tu as gagné ${n} bloc${n > 1 ? 's' : ''} !`;
  const hero = currentHero();
  const next = nextInMission();
  const chest = chestReady();
  // never "ton héros" / "tes héros" in speech: voices sometimes glue the words (« tes-z-héros »)
  const invite = chest ? "Tu as fini l'aventure du jour : un coffre t'attend !" : next ? `On continue l'aventure ? Maintenant, on va ${VERB[next]} !` : hero ? 'Tu veux colorier un ami ?' : 'Tu peux construire ta maison !';
  let title = 'Bravo !';
  let speech: string;
  if (result.next && result.isNew) {
    title = `Niveau ${result.next} débloqué !`;
    speech = `Bravo ! ${blocks} Et tu passes au niveau ${result.next} ! ${invite}`;
  } else if (result.next) {
    title = `Niveau ${result.next} !`;
    speech = `Bravo ! ${blocks} On passe au niveau ${result.next}. ${invite}`;
  } else if (result.passed) {
    speech = `Bravo ! ${blocks} Tu as réussi le dernier niveau ! ${invite}`;
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

  const stars = h('div', { class: 'stars big', role: 'img', 'aria-label': `${result.stars} étoile${result.stars > 1 ? 's' : ''} sur 3` });
  for (let i = 0; i < 3; i++) {
    const s = h('span', { class: i < result.stars ? 'on' : '' }, '★');
    s.style.animationDelay = `${300 + i * 250}ms`;
    stars.append(s);
  }

  const actions = h('div', { class: 'actions' });
  if (chest) {
    const b = h('button', { class: 'btn big gold' }, 'Le coffre !');
    b.onclick = () => openChest(ctx, () => ctx.go('home'));
    actions.append(b);
  } else if (next) {
    const b = h('button', { class: 'btn big gold' }, 'Continuer', h('span', { class: 'btn-strip' }, missionStrip()));
    b.onclick = () => ctx.go(next);
    actions.append(b);
  }
  const colour = hero
    ? h('button', { class: 'btn big green' }, h('span', { class: 'btn-hero', html: heroSVG(hero, new Set(state.heroes.filled[hero.id] ?? []), 34) }), 'Colorier')
    : h('button', { class: 'btn big green' }, blockImg('wood', 'block mini'), 'Ma maison');
  colour.onclick = () => ctx.go(hero ? 'color' : 'build');
  const again = h('button', { class: 'btn big' }, result.next ? 'Niveau suivant' : 'Rejouer');
  again.onclick = () => ctx.go(replay);
  actions.append(colour, again);

  ctx.root.append(
    h(
      'main',
      { class: 'screen reward' },
      topBar(() => ctx.go('home')),
      h('div', { class: 'hero' }, mascot(140, () => void ctx.say(speech)), bubble(title)),
      stars,
      loot,
      actions,
    ),
  );
}
