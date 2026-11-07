// La carte d'une activité : les niveaux en chemin, groupés en chapitres (biomes). Le niveau en
// cours brille, les niveaux réussis montrent leurs étoiles, les suivants sont fermés.
// L'enfant voit où il en est et choisit parmi les niveaux déjà atteints.
import { sfx } from '../audio';
import { ACTIVITY_NAMES, CHAPTERS, chapterOf, currentLevel, LEVEL_NAMES, MAX_LEVEL, setLevel, starsOf, unlockedLevel } from '../levels';
import { foxSVG } from '../pixel';
import type { ActivityId } from '../state';
import { bubble, h, mascot, reducedMotion, topBar } from '../ui';
import type { Ctx } from './types';

export function mapScreen(ctx: Ctx, a: ActivityId): void {
  const current = currentLevel(a);
  const unlocked = unlockedLevel(a);
  const path = h('div', { class: `map map-${a}` });
  let currentNode: HTMLElement | null = null;

  let chapter = -1;
  let section: HTMLElement | null = null;
  for (let n = 1; n <= MAX_LEVEL[a]; n++) {
    const c = chapterOf(a, n);
    if (c !== chapter || !section) {
      chapter = c;
      section = h('section', { class: `chapter c${c}`, 'aria-label': CHAPTERS[a][c] }, h('h2', { class: 'chapter-title' }, CHAPTERS[a][c]));
      path.append(section);
    }
    const open = n <= unlocked;
    const stars = starsOf(a, n);
    const isCurrent = n === current;
    const node = h(
      'button',
      {
        class: `node pos${n % 4}${open ? '' : ' locked'}${isCurrent ? ' current' : ''}${stars > 0 ? ' done' : ''}`,
        'aria-label': `Niveau ${n} : ${LEVEL_NAMES[a][n - 1]}${open ? '' : ', fermé'}${stars ? `, ${stars} étoile${stars > 1 ? 's' : ''}` : ''}`,
      },
      h('span', { class: 'node-block' }, h('span', { class: 'node-no' }, open ? String(n) : '🔒')),
      h('span', { class: 'node-stars', 'aria-hidden': 'true' }, ...[1, 2, 3].map((k) => h('span', { class: k <= stars ? 'on' : '' }, '★'))),
      h('span', { class: 'node-name' }, LEVEL_NAMES[a][n - 1]),
    );
    if (isCurrent) {
      node.append(h('span', { class: 'node-fox', 'aria-hidden': 'true', html: foxSVG(44) }));
      currentNode = node;
    }
    node.onclick = () => {
      sfx.unlock();
      if (!open) {
        sfx.oops();
        void ctx.say("Ce niveau est encore fermé. Réussis le niveau d'avant pour l'ouvrir !");
        return;
      }
      sfx.tap();
      setLevel(a, n);
      ctx.go(a);
    };
    section.append(node);
  }

  const speech = `Voici la carte ! Touche le bloc qui brille pour jouer.`;
  ctx.root.append(
    h(
      'main',
      { class: `screen map-screen` },
      topBar(() => ctx.go('home'), ACTIVITY_NAMES[a]),
      h('div', { class: 'hero small' }, mascot(70, () => void ctx.say(speech)), bubble('Choisis un niveau !')),
      path,
    ),
  );
  // show the current level (the map can be long)
  requestAnimationFrame(() => currentNode?.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }));
  void ctx.say(speech);
}
