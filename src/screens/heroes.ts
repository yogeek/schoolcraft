// Mini-jeu récompense : colorier des héros (coloriage magique numéroté), qui s'animent une fois finis
// et rejoignent la collection « Mes héros ». Un héros se réveille avec les étoiles gagnées dans les
// niveaux (pas avec des blocs : une récompense qu'on achète en rejouant un niveau facile pousse à
// « farmer » au lieu d'apprendre) ; le colorier est ensuite gratuit.
// Voix : on ne dit jamais « tes héros » / « les héros » (certaines voix lient : « tes-z-héros »).
import { sfx } from '../audio';
import { ADDITION_HEROES_FROM, HEROES, regions, type Hero } from '../content/heroes';
import { burst, heroSVG, isComplete } from '../heroArt';
import { gameIsNew, gameOpen, giftFirstGame, medalsOf } from '../heroGames';
import { totalStars } from '../levels';
import { medalRow, playHeroGame } from './heroGame';
import { exploring, save, state } from '../state';
import { bubble, setBubble, h, mascot, reducedMotion, topBar } from '../ui';
import type { Ctx } from './types';

const NUMBERS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];

/** Stars needed (over all the levels) before hero number `i` (0 = the first) can be coloured: a new
 *  friend every 5 stars, about one every 2 or 3 levels passed. */
export function starsNeeded(i: number): number {
  return 3 + 5 * i;
}

/** Stars still missing before the next hero can be coloured (0 when one is ready, or all are awake). */
export function starsToNextHero(): number {
  const hero = currentHero();
  if (!hero) return 0;
  return Math.max(0, starsNeeded(HEROES.indexOf(hero)) - totalStars());
}

/** The hero the child can colour now: the next one, once enough stars are won. A hero already
 *  started (coloured with blocks before stars woke heroes) stays open. */
export function readyHero(): Hero | null {
  const hero = currentHero();
  if (!hero) return null;
  return (state.heroes.filled[hero.id]?.length ?? 0) > 0 || starsToNextHero() === 0 ? hero : null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const FEM = ['zéro', 'une', 'deux', 'trois', 'quatre', 'cinq'];
/** « Encore trois étoiles, et un ami se réveille ! » (the gap is at most 5 stars, except in old saves) */
export function starsLine(n: number): string {
  if (n < 1 || n >= FEM.length) return 'Gagne des étoiles pour les réveiller.';
  return n === 1 ? 'Encore une étoile, et un ami se réveille !' : `Encore ${FEM[n]} étoiles, et un ami se réveille !`;
}

/** The hero waiting to be coloured (null when all are awake). Repairs a hero coloured but not marked done. */
export function currentHero(): Hero | null {
  let repaired = false;
  for (const x of HEROES) {
    if (!state.heroes.done.includes(x.id) && isComplete(x, state.heroes.filled[x.id] ?? [])) {
      state.heroes.done.push(x.id);
      repaired = true;
    }
  }
  if (repaired) save();
  return HEROES.find((x) => !state.heroes.done.includes(x.id)) ?? null;
}

/** Season 2 heroes are coloured with additions: each colour carries `a + b`, its cells show the sum.
 *  The sums (2 to 9, all different) and their terms are drawn from the hero's id, so a hero coloured
 *  in several sittings keeps the same numbers. */
export function additionsOf(hero: Hero): Record<string, { a: number; b: number; sum: number }> | null {
  if (HEROES.indexOf(hero) < ADDITION_HEROES_FROM) return null;
  let seed = [...hero.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 8) % n;
  };
  const sums = [2, 3, 4, 5, 6, 7, 8, 9];
  const out: Record<string, { a: number; b: number; sum: number }> = {};
  for (const z of regions(hero)) {
    const sum = sums.splice(rand(sums.length), 1)[0];
    const a = 1 + rand(sum - 1);
    out[z] = { a, b: sum - a, sum };
  }
  return out;
}

function filledOf(hero: Hero): string[] {
  return (state.heroes.filled[hero.id] ??= []);
}

// ---------------------------------------------------------------- album
export function heroesScreen(ctx: Ctx): void {
  giftFirstGame();
  const current = currentHero();
  const ready = readyHero();
  const missing = starsToNextHero();
  const grid = h('div', { class: 'album' });

  for (const hero of HEROES) {
    const done = state.heroes.done.includes(hero.id);
    const isCurrent = hero === current;
    let art: string;
    let label: string;
    if (done) {
      art = heroSVG(hero, 'all', 96, 'idle');
      label = hero.name;
    } else if (isCurrent && ready) {
      art = heroSVG(hero, new Set(filledOf(hero)), 96);
      label = 'À colorier';
    } else if (isCurrent) {
      art = heroSVG(hero, 'silhouette', 96);
      label = `encore ${missing} ★`;
    } else {
      art = heroSVG(hero, 'silhouette', 96);
      label = '???';
    }
    const game = done && gameOpen(hero.id);
    const card = h(
      'button',
      {
        class: `hero-card${done ? ' done' : ''}${game ? ' has-game' : ''}${game && gameIsNew(hero.id) ? ' new-game' : ''}${isCurrent && ready ? ' current' : ''}${isCurrent && !ready ? ' next' : ''}${!done && !(isCurrent && ready) ? ' locked' : ''}`,
        'aria-label': done ? `${hero.name}, ${hero.title}` : isCurrent && !ready ? `Encore ${missing} étoiles` : label,
      },
      h('div', { class: 'hero-art', html: art }),
      isCurrent && !ready ? h('span', { class: 'need' }, `${missing} ★`) : h('span', {}, label),
      game ? h('span', { class: 'game-badge', 'aria-hidden': 'true' }, '▶') : '',
    );
    card.onclick = () => {
      sfx.unlock();
      if (done) showHero(hero, false, ctx);
      else if (isCurrent && ready) ctx.go('color');
      else if (isCurrent) {
        sfx.oops();
        void ctx.say(starsLine(missing));
      } else {
        sfx.oops();
        void ctx.say(ready ? "Celui-là dort encore. Colorie d'abord le personnage qui t'attend !" : `Celui-là dort encore. ${starsLine(missing)}`);
      }
    };
    grid.append(card);
  }

  const count = state.heroes.done.length;
  const all = count >= HEROES.length;
  // a game no one has played yet: its friend calls the child
  const fresh = HEROES.find((x) => state.heroes.done.includes(x.id) && gameIsNew(x.id));
  const bubbleText = fresh ? `${fresh.name} a un jeu !` : all ? 'Tu as tous les héros !' : ready ? (count === 0 ? 'Colorie ton premier héros !' : `${count} héros sur ${HEROES.length}`) : `Encore ${missing} ★ !`;
  const speech = fresh
    ? `${fresh.name} t'a préparé un jeu ! Touche son image pour jouer.`
    : all
    ? 'Bravo, tu as réveillé tout le monde ! Touche un ami pour le voir.'
    : ready
      ? count === 0
        ? 'Voici tes amis. Ils dorment ! Colorie-les pour les réveiller.'
        : 'Voici tes amis ! Touche celui qui brille pour le colorier.'
      : count === 0
        ? `Voici tes amis. Ils dorment ! ${starsLine(missing)}`
        : `Voici tes amis ! ${starsLine(missing)}`;
  ctx.root.append(
    h(
      'main',
      { class: 'screen heroes' },
      topBar(() => ctx.go('home'), 'Mes héros'),
      h('div', { class: 'hero small' }, mascot(80, () => void ctx.say(speech)), bubble(bubbleText)),
      grid,
    ),
  );
  // with 24 friends, the one waiting is far down the album: bring it into view
  if (count >= 6) grid.querySelector('.hero-card.new-game, .hero-card.current, .hero-card.next')?.scrollIntoView({ block: 'center' });
  void ctx.say(speech);
}

/** Big animated view of a hero, with its effect. */
function showHero(hero: Hero, isNew: boolean, ctx: Ctx): void {
  const art = h('button', { class: `hero-stage move-${hero.move}`, 'aria-label': `${hero.name} : rejouer`, html: heroSVG(hero, 'all', 220, 'idle') });
  const close = () => overlay.remove();
  const actions = h('div', { class: 'actions' });
  if (isNew) {
    const toAlbum = h('button', { class: 'btn big green' }, 'Mes héros');
    toAlbum.onclick = () => ctx.go('heroes'); // go() closes the overlay
    const home = h('button', { class: 'btn big' }, 'Accueil');
    home.onclick = () => ctx.go('home');
    actions.append(toAlbum, home);
  } else {
    if (gameOpen(hero.id)) {
      const play = h('button', { class: 'btn big green' }, '▶ Jouer');
      play.onclick = () => playHeroGame(ctx, hero.id);
      actions.append(play);
    }
    // parent mode: any friend can be coloured again (season 2: with additions), in the parents' own save
    if (exploring) {
      const paint = h('button', { class: 'btn big' }, 'Colorier');
      paint.onclick = () => {
        state.heroes.done = state.heroes.done.filter((x) => x !== hero.id);
        state.heroes.filled[hero.id] = [];
        save();
        forced = hero;
        ctx.go('color');
      };
      actions.append(paint);
    }
    const back = h('button', { class: 'btn' }, 'Fermer');
    back.onclick = close;
    actions.append(back);
  }
  const title = h('div', { class: 'hero-name' }, hero.name, h('small', {}, hero.title));
  const medals = !isNew && gameOpen(hero.id) ? medalRow(medalsOf(hero.id)) : '';
  const panel = h('div', { class: 'panel hero-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': hero.name }, isNew ? h('div', { class: 'new-badge' }, 'Nouveau héros\u00a0!') : '', art, title, medals, actions);
  const overlay = h('div', { class: 'overlay hero-overlay' }, panel);
  if (!isNew) overlay.onclick = (e) => e.target === overlay && close();
  document.body.append(overlay);

  const open = () => overlay.isConnected && ctx.alive();
  const play = () => {
    if (!open()) return;
    art.classList.remove('play');
    void art.offsetWidth;
    art.classList.add('play');
    if (!reducedMotion()) burst(art, hero.effect);
    sfx.fanfare();
  };
  art.onclick = () => {
    play();
    void ctx.say(hero.line);
  };
  play();
  void (async () => {
    await ctx.say(isNew ? `Tu as réveillé ${hero.name}, ${hero.title} !` : `${hero.name}, ${hero.title} !`);
    if (!open()) return;
    await ctx.say(hero.line);
    if (!open()) return;
    play();
    if ((await ctx.wait(1300)) && open() && !reducedMotion()) burst(art, hero.effect, 12);
  })();
}

// ---------------------------------------------------------------- colouring
/** parent mode: the friend chosen to be coloured again */
let forced: Hero | null = null;

export function colorScreen(ctx: Ctx): void {
  const hero = exploring && forced && !state.heroes.done.includes(forced.id) ? forced : readyHero();
  if (!hero) return ctx.go('heroes');
  const zones = regions(hero);
  const filled = filledOf(hero);
  const sums = additionsOf(hero);
  /** the number written on a zone's cells: its rank, or the sum of its addition */
  const label = (z: string) => (sums ? sums[z].sum : zones.indexOf(z) + 1);
  const question = (z: string) => `Combien font : ${NUMBERS[sums![z].a]}… plus… ${NUMBERS[sums![z].b]} ?`;
  const answer = (z: string) => `${cap(NUMBERS[sums![z].a])}… plus… ${NUMBERS[sums![z].b]}… ça fait : ${NUMBERS[sums![z].sum]} !`;
  let misses = 0; // wrong cells for the selected colour (additions: the answer shows from the 2nd)
  let selected: string | null = zones.find((z) => !filled.includes(z)) ?? null;
  let busy = false;
  let talk = 0; // latest spoken reaction; an older follow-up sentence is dropped

  const cols = hero.rows[0].length;
  const grid = h('div', { class: 'paint-grid', role: 'grid', 'aria-label': 'Coloriage magique' });
  grid.style.setProperty('--cols', String(cols));
  grid.style.setProperty('--rows', String(hero.rows.length));
  const cells: { el: HTMLElement; zone: string; x: number; y: number }[] = [];

  hero.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const el = h('div', { class: 'px' });
      if (ch === '.') el.classList.add('empty');
      else if (ch === 'k' || ch === 'e') el.classList.add('ink');
      else {
        el.classList.add('zone');
        el.dataset.n = String(label(ch));
        cells.push({ el, zone: ch, x, y });
        el.onclick = () => void tap(ch, x, y);
      }
      grid.append(el);
    }),
  );

  const palette = h('div', { class: 'paint-palette' });
  const bub = bubble('Qui est-ce ?');
  const instructions = sums
    ? 'Qui est-ce ? Colorie pour le découvrir ! Chaque couleur a un calcul. Touche les cases avec la réponse !'
    : 'Qui est-ce ? Colorie pour le découvrir ! Choisis une couleur en bas, puis touche les cases avec le même chiffre.';

  function paintCell(c: (typeof cells)[number]): void {
    c.el.style.background = hero!.palette[c.zone].color;
    c.el.classList.add('painted');
  }
  cells.filter((c) => filled.includes(c.zone)).forEach(paintCell);

  function sayColour(z: string): Promise<void> {
    const n = zones.indexOf(z) + 1;
    const name = hero!.palette[z].name;
    const the = /^[aeiouyéèêh]/i.test(name) ? `L'${name}` : `Le ${name}`; // « L'orange », « Le bleu »
    if (sums) return ctx.say(`${the}. ${question(z)}`);
    return ctx.say(`${the}. Touche les cases avec le chiffre : ${NUMBERS[n]} !`);
  }

  function renderPalette(): void {
    palette.replaceChildren(
      ...zones
        .filter((z) => !filled.includes(z))
        .map((z) => {
          const n = zones.indexOf(z) + 1;
          const sw = sums
            ? h('button', { class: `swatch sum${z === selected ? ' selected' : ''}`, 'aria-label': `${hero!.palette[z].name}, ${sums[z].a} plus ${sums[z].b}` }, h('span', {}, `${sums[z].a}+${sums[z].b}`))
            : h('button', { class: `swatch${z === selected ? ' selected' : ''}`, 'aria-label': `${hero!.palette[z].name}, chiffre ${n}` }, h('span', {}, String(n)));
          sw.style.background = hero!.palette[z].color;
          sw.onclick = () => {
            sfx.tap();
            if (z !== selected) misses = 0;
            selected = z;
            renderPalette();
            talk++;
            void sayColour(z);
          };
          return sw;
        }),
    );
    // with additions the cells to touch are the answer: they glow only after two wrong ones
    cells.forEach((c) => c.el.classList.toggle('hint', c.zone === selected && !filled.includes(c.zone) && (!sums || misses >= 2)));
  }
  renderPalette();

  async function tap(zone: string, x: number, y: number): Promise<void> {
    sfx.unlock();
    if (busy || filled.includes(zone) || !selected) return;
    if (zone !== selected) {
      sfx.oops();
      const n = label(zone);
      const want = label(selected);
      talk++;
      if (sums) {
        // help grows: the question again, then the answer and the cells to touch glow
        misses++;
        const { a, b } = sums[selected];
        if (misses === 1) {
          setBubble(bub, `${a} + ${b} = ?`);
          await ctx.say(`Ici, c'est le chiffre ${NUMBERS[n]}. ${question(selected)}`);
        } else {
          setBubble(bub, `${a} + ${b} = ${want}`);
          renderPalette();
          await ctx.say(`${answer(selected)} Cherche le chiffre ${NUMBERS[want]} !`);
        }
        return;
      }
      setBubble(bub, `Cherche le ${want} !`);
      await ctx.say(`Ici, c'est le chiffre ${NUMBERS[n]}. Cherche le chiffre ${NUMBERS[want]} !`);
      return;
    }
    busy = true;
    sfx.place();
    filled.push(zone);
    const complete = isComplete(hero!, filled);
    if (complete) state.heroes.done.push(hero!.id); // saved together: closing the app now cannot lose the hero
    save();
    // paint the zone like a wave spreading from the tapped cell
    const zoneCells = cells.filter((c) => c.zone === zone);
    const step = reducedMotion() ? 0 : 45;
    zoneCells.forEach((c) => {
      const d = Math.abs(c.x - x) + Math.abs(c.y - y);
      setTimeout(() => {
        paintCell(c);
        if (step) c.el.animate([{ transform: 'scale(.3)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 250 });
      }, d * step);
    });
    const maxD = Math.max(...zoneCells.map((c) => Math.abs(c.x - x) + Math.abs(c.y - y)));
    if (!(await ctx.wait(maxD * step + 250))) return;
    selected = zones.find((z) => !filled.includes(z)) ?? null;
    misses = 0;
    renderPalette();
    busy = false;

    if (complete) {
      setBubble(bub, 'Il se réveille !');
      grid.classList.add('wake');
      if (await ctx.wait(700)) showHero(hero!, true, ctx);
      return;
    }
    const left = zones.length - filled.length;
    setBubble(bub, left === 1 ? 'Encore une couleur !' : `Encore ${left} couleurs !`);
    const my = ++talk;
    // with additions, the calculation is said in full once found (« un… plus… deux… ça fait : trois ! »)
    const done = sums ? answer(zone) : 'Bravo !';
    await ctx.say(left === 1 ? `${done} Encore une couleur !` : `${done} Encore ${NUMBERS[left]} couleurs.`);
    if (my === talk && selected && !busy) void sayColour(selected);
  }

  const repeat = () => {
    const my = ++talk;
    if (selected)
      void ctx.say(filled.length === 0 ? instructions : 'On continue le coloriage !').then(() => {
        if (my === talk && selected && !busy) void sayColour(selected);
      });
  };

  ctx.root.append(
    h(
      'main',
      { class: 'screen color' },
      topBar(() => ctx.go('home'), 'Coloriage'),
      h('div', { class: 'hero small' }, mascot(70, repeat), bub),
      h('div', { class: 'paint-wrap' }, grid),
      palette,
    ),
  );

  repeat();
}
