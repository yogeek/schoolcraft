// Mini-jeu récompense : colorier des héros (coloriage magique numéroté), qui s'animent une fois finis
// et rejoignent la collection « Mes héros ». Chaque couleur posée coûte un bloc gagné en jouant.
import { say, sfx } from '../audio';
import { HEROES, regions, type Hero } from '../content/heroes';
import { burst, heroSVG, isComplete } from '../heroArt';
import { foxSVG } from '../pixel';
import { save, spendBlock, state, totalBlocks } from '../state';
import { bumpCounter, h, topBar, wait } from '../ui';
import type { Ctx } from './types';

const NUMBERS = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];

export function currentHero(): Hero | null {
  return HEROES.find((x) => !state.heroes.done.includes(x.id)) ?? null;
}

function filledOf(hero: Hero): string[] {
  return (state.heroes.filled[hero.id] ??= []);
}

// ---------------------------------------------------------------- album
export function heroesScreen(ctx: Ctx): void {
  const current = currentHero();
  const grid = h('div', { class: 'album' });

  for (const hero of HEROES) {
    const done = state.heroes.done.includes(hero.id);
    const isCurrent = hero === current;
    let art: string;
    let label: string;
    if (done) {
      art = heroSVG(hero, 'all', 96, 'idle');
      label = hero.name;
    } else if (isCurrent) {
      art = heroSVG(hero, new Set(filledOf(hero)), 96);
      label = 'À colorier';
    } else {
      art = heroSVG(hero, 'silhouette', 96);
      label = '???';
    }
    const card = h('button', { class: `hero-card${done ? ' done' : ''}${isCurrent ? ' current' : ''}${!done && !isCurrent ? ' locked' : ''}`, 'aria-label': label }, h('div', { class: 'hero-art', html: art }), h('span', {}, label));
    card.onclick = () => {
      sfx.unlock();
      if (done) showHero(hero, false, ctx);
      else if (isCurrent) ctx.go('color');
      else {
        sfx.oops();
        void say("Ce héros dort encore. Colorie d'abord le héros qui t'attend !");
      }
    };
    grid.append(card);
  }

  const count = state.heroes.done.length;
  const bubbleText = count === 0 ? 'Colorie ton premier héros !' : count === HEROES.length ? 'Tu as tous les héros !' : `${count} héros sur ${HEROES.length}`;
  ctx.root.append(
    h(
      'main',
      { class: 'screen heroes' },
      topBar(() => ctx.go('home'), 'Mes héros'),
      h('div', { class: 'hero small' }, h('div', { class: 'fox-btn', html: foxSVG(80) }), h('div', { class: 'bubble' }, bubbleText)),
      grid,
    ),
  );
  void say(
    count === 0
      ? 'Voici tes héros. Ils dorment ! Colorie-les pour les réveiller.'
      : count === HEROES.length
        ? 'Bravo, tu as réveillé tous les héros ! Touche-les pour les voir.'
        : 'Voici tes héros ! Touche le héros à colorier.',
  );
}

/** Big animated view of a hero, with its effect. */
function showHero(hero: Hero, isNew: boolean, ctx: Ctx): void {
  const art = h('div', { class: `hero-stage move-${hero.move}`, html: heroSVG(hero, 'all', 220, 'idle') });
  const close = () => overlay.remove();
  const toAlbum = h('button', { class: 'btn big green' }, 'Mes héros');
  toAlbum.onclick = () => {
    close();
    ctx.go('heroes');
  };
  const home = h('button', { class: 'btn big' }, 'Accueil');
  home.onclick = () => {
    close();
    ctx.go('home');
  };
  const title = h('div', { class: 'hero-name' }, hero.name, h('small', {}, hero.title));
  const overlay = h('div', { class: 'overlay hero-overlay' }, h('div', { class: 'panel hero-panel' }, isNew ? h('div', { class: 'new-badge' }, 'Nouveau héros !') : '', art, title, h('div', { class: 'actions' }, toAlbum, home)));
  if (!isNew) {
    const back = h('button', { class: 'btn' }, 'Fermer');
    back.onclick = close;
    overlay.querySelector('.actions')!.replaceChildren(back);
    overlay.onclick = (e) => e.target === overlay && close();
  }
  document.body.append(overlay);

  const play = () => {
    art.classList.remove('play');
    void art.offsetWidth;
    art.classList.add('play');
    burst(art, hero.effect);
    sfx.fanfare();
  };
  art.onclick = () => {
    play();
    void say(hero.line);
  };
  play();
  void (async () => {
    await say(isNew ? `Tu as réveillé ${hero.name}, ${hero.title} !` : `${hero.name}, ${hero.title} !`);
    await say(hero.line);
    if (document.body.contains(art)) {
      play();
      await wait(1300);
      if (document.body.contains(art)) burst(art, hero.effect, 12);
    }
  })();
}

// ---------------------------------------------------------------- colouring
export function colorScreen(ctx: Ctx): void {
  const hero = currentHero();
  if (!hero) return ctx.go('heroes');
  const zones = regions(hero);
  const filled = filledOf(hero);
  let selected: string | null = zones.find((z) => !filled.includes(z)) ?? null;
  let busy = false;

  const cols = hero.rows[0].length;
  const grid = h('div', { class: 'paint-grid' });
  grid.style.setProperty('--cols', String(cols));
  const cells: { el: HTMLElement; zone: string; x: number; y: number }[] = [];

  hero.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const el = h('div', { class: 'px' });
      if (ch === '.') el.classList.add('empty');
      else if (ch === 'k' || ch === 'e') el.classList.add('ink');
      else {
        el.classList.add('zone');
        el.dataset.n = String(zones.indexOf(ch) + 1);
        cells.push({ el, zone: ch, x, y });
        el.onclick = () => void tap(ch, x, y);
      }
      grid.append(el);
    }),
  );

  const palette = h('div', { class: 'paint-palette' });
  const bubble = h('div', { class: 'bubble' }, 'Qui est-ce ?');

  function paintCell(c: (typeof cells)[number]): void {
    c.el.style.background = hero!.palette[c.zone].color;
    c.el.classList.add('painted');
  }
  cells.filter((c) => filled.includes(c.zone)).forEach(paintCell);

  function renderPalette(): void {
    palette.replaceChildren(
      ...zones
        .filter((z) => !filled.includes(z))
        .map((z) => {
          const n = zones.indexOf(z) + 1;
          const sw = h('button', { class: `swatch${z === selected ? ' selected' : ''}`, 'aria-label': `${hero!.palette[z].name}, chiffre ${n}` }, h('span', {}, String(n)));
          sw.style.background = hero!.palette[z].color;
          sw.onclick = () => {
            sfx.tap();
            selected = z;
            renderPalette();
            void say(`Le ${hero!.palette[z].name}. Touche les cases avec le chiffre : ${NUMBERS[n]} !`);
          };
          return sw;
        }),
    );
    cells.forEach((c) => c.el.classList.toggle('hint', c.zone === selected && !filled.includes(c.zone)));
  }
  renderPalette();

  async function tap(zone: string, x: number, y: number): Promise<void> {
    sfx.unlock();
    if (busy || filled.includes(zone)) return;
    if (!selected) return;
    if (zone !== selected) {
      sfx.oops();
      const n = zones.indexOf(zone) + 1;
      const want = zones.indexOf(selected) + 1;
      bubble.textContent = `Cherche le ${want} !`;
      await say(`Ici, c'est le chiffre ${NUMBERS[n]}. Cherche le chiffre ${NUMBERS[want]} !`);
      return;
    }
    if (!spendBlock()) {
      sfx.oops();
      showNoBlocks();
      return;
    }
    busy = true;
    bumpCounter();
    sfx.place();
    filled.push(zone);
    save();
    // paint the zone like a wave spreading from the tapped cell
    const zoneCells = cells.filter((c) => c.zone === zone);
    zoneCells.forEach((c) => {
      const d = Math.abs(c.x - x) + Math.abs(c.y - y);
      setTimeout(() => {
        paintCell(c);
        c.el.animate([{ transform: 'scale(.3)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 250 });
      }, d * 45);
    });
    const maxD = Math.max(...zoneCells.map((c) => Math.abs(c.x - x) + Math.abs(c.y - y)));
    await wait(maxD * 45 + 250);
    selected = zones.find((z) => !filled.includes(z)) ?? null;
    renderPalette();
    busy = false;

    if (isComplete(hero!, filled)) {
      state.heroes.done.push(hero!.id);
      save();
      bubble.textContent = 'Il se réveille !';
      grid.classList.add('wake');
      await wait(700);
      showHero(hero!, true, ctx);
      return;
    }
    const left = zones.length - filled.length;
    bubble.textContent = left === 1 ? 'Encore une couleur !' : `Encore ${left} couleurs !`;
    void say(left === 1 ? 'Bravo ! Encore une couleur !' : `Bravo ! Encore ${NUMBERS[left]} couleurs.`);
  }

  function showNoBlocks(): void {
    bubble.textContent = 'Il te faut des blocs !';
    void say("Il te faut des blocs pour colorier. Joue à lire ou à compter pour en gagner !");
    actions.hidden = false;
  }

  const read = h('button', { class: 'btn' }, 'Lire');
  read.onclick = () => ctx.go('sounds');
  const count = h('button', { class: 'btn' }, 'Compter');
  count.onclick = () => ctx.go('count');
  const actions = h('div', { class: 'actions small' }, read, count);
  actions.hidden = true;

  ctx.root.append(
    h(
      'main',
      { class: 'screen color' },
      topBar(() => ctx.go('heroes'), 'Coloriage'),
      h('div', { class: 'hero small' }, h('div', { class: 'fox-btn', html: foxSVG(70) }), bubble),
      actions,
      h('div', { class: 'paint-wrap' }, grid),
      palette,
    ),
  );

  if (totalBlocks() === 0) showNoBlocks();
  else if (filled.length === 0) void say("Qui est-ce ? Colorie pour le découvrir ! Choisis une couleur en bas, puis touche les cases avec le même chiffre. Chaque couleur coûte un bloc.");
  else void say('On continue le coloriage !');
}
