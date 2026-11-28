// Un petit jeu d'ami : 5 questions avec le moteur des niveaux (aide qui grandit, félicitations),
// sans étoiles ni blocs. Réussir (4 du premier coup sur 5) donne une médaille et ouvre le palier
// suivant ; 3 médailles par jeu.
import { sfx } from '../audio';
import { HEROES } from '../content/heroes';
import { runSession } from '../game';
import { heroGame } from '../games/heroGames';
import { endHeroGame, gameOpen, isGameHero, MEDALS, medalsOf, type GameHero } from '../heroGames';
import { burst, heroSVG } from '../heroArt';
import { bubble, h, mascot, reducedMotion } from '../ui';
import type { Ctx } from './types';

let playing: GameHero | null = null;

/** Open this hero's game (from the album). */
export function playHeroGame(ctx: Ctx, id: string): void {
  if (!isGameHero(id)) return;
  playing = id;
  ctx.go('herogame');
}

/** A row of 3 medals, the won ones filled. */
export function medalRow(won: number, cls = ''): HTMLElement {
  const row = h('div', { class: `medals ${cls}`.trim(), role: 'img', 'aria-label': `${won} médailles sur ${MEDALS}` });
  for (let i = 0; i < MEDALS; i++) row.append(h('span', { class: `medal${i < won ? ' won' : ''}` }));
  return row;
}

export function heroGameScreen(ctx: Ctx): void {
  if (!playing || !gameOpen(playing)) return ctx.go('heroes');
  const id: GameHero = playing;
  const hero = HEROES.find((x) => x.id === id)!;
  const tier = Math.min(MEDALS - 1, medalsOf(id));
  const spec = heroGame(id, tier);
  const top = h('div', { class: 'game-title' }, h('span', { class: 'game-hero', html: heroSVG(hero, 'all', 40, 'idle') }), medalRow(medalsOf(id)));
  runSession(ctx, {
    activity: spec.activity,
    levelNo: 0,
    intro: spec.intro,
    game: spec.game,
    free: { top, finish: (firstTry, rounds) => end(endHeroGame(id, firstTry, rounds)) },
  });

  function end({ before, after }: { before: number; after: number }): void {
    const won = after > before;
    const speech = won
      ? after === MEDALS
        ? `Bravo ! Tu as gagné toutes les médailles de ${hero.name} !`
        : 'Bravo ! Tu as gagné une médaille ! La prochaine fois, ce sera un peu plus dur.'
      : after === MEDALS
        ? 'Bravo, quelle belle partie !'
        : "Encore un peu d'entraînement, et tu gagneras une médaille !";
    const art = h('div', { class: `hero-stage move-${hero.move}`, html: heroSVG(hero, 'all', 160, 'idle') });
    const again = h('button', { class: 'btn big green' }, 'Rejouer');
    again.onclick = () => playHeroGame(ctx, id);
    const album = h('button', { class: 'btn big' }, 'Mes héros');
    album.onclick = () => ctx.go('heroes');
    const medals = medalRow(after, 'big');
    if (won) medals.children[after - 1]?.classList.add('new');
    const panel = h(
      'div',
      { class: 'panel hero-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': hero.name },
      art,
      medals,
      h('div', { class: 'hero small' }, mascot(70, () => void ctx.say(speech)), bubble(won ? 'Une médaille !' : after === MEDALS ? 'Bravo !' : 'Encore un peu !')),
      h('div', { class: 'actions' }, again, album),
    );
    document.body.append(h('div', { class: 'overlay hero-overlay' }, panel));
    if (won) {
      sfx.fanfare();
      art.classList.add('play');
      if (!reducedMotion()) burst(art, hero.effect);
    }
    void ctx.say(speech);
  }
}
