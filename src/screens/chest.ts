// L'aventure du jour : une partie de Lire, d'Écrire et de Compter. Quand les trois sont faites, un
// coffre s'ouvre avec des blocs spéciaux (briques, feuilles, fleurs, cristal) pour la maison.
// Pas de série à ne pas casser : un jour sans jeu ne fait rien perdre. Après le coffre, Pixel propose
// doucement de s'arrêter là (« À demain ? ») : l'enfant peut encore jouer, mais la séance a une fin.
import { sfx } from '../audio';
import { burst, heroSVG } from '../heroArt';
import { openNextGame } from '../heroGames';
import { ACTIVITY_NAMES } from '../levels';
import { BLOCK_NAMES, chestSVG, foxSVG } from '../pixel';
import { ACTIVITIES, mission, save, SPECIAL_BLOCKS, state, type ActivityId, type BlockType } from '../state';
import { blockImg, bubble, bumpCounter, h, HOUSE_SVG, mascot, reducedMotion, shuffle, topBar } from '../ui';
import type { Ctx } from './types';

/** The next activity of today's adventure, or null when all three are done. */
export function nextInMission(): ActivityId | null {
  const m = mission();
  return ACTIVITIES.find((a) => !m.done.includes(a)) ?? null;
}

export function chestReady(): boolean {
  const m = mission();
  return !m.chest && nextInMission() === null;
}

/** Open today's chest (once a day). */
export function openChest(ctx: Ctx, then: () => void): void {
  const m = mission();
  if (m.chest) return then();
  const specials = shuffle([...SPECIAL_BLOCKS]).slice(0, 2);
  const loot: BlockType[] = [specials[0], specials[0], specials[1], 'gold', 'gold'];
  m.chest = true;
  state.chests++;
  for (const t of loot) state.inventory[t]++;
  // and a key: the next friend's little game opens (none when no awake friend has one left)
  const friend = openNextGame();
  save();

  const art = h('button', { class: 'chest-btn', 'aria-label': 'Ouvrir le coffre', html: chestSVG(200, false) });
  const items = h('div', { class: 'loot' });
  const done = h('button', { class: 'btn big green' }, 'Super !');
  done.hidden = true;
  const title = h('div', { class: 'hero-name' }, 'Le coffre du jour');
  const panel = h('div', { class: 'panel hero-panel chest-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Le coffre du jour' }, title, art, items, h('div', { class: 'actions' }, done));
  const overlay = h('div', { class: 'overlay hero-overlay' }, panel);
  document.body.append(overlay);

  let opened = false;
  const open = async () => {
    if (opened) return;
    opened = true;
    sfx.chest();
    art.innerHTML = chestSVG(200, true);
    art.classList.add('opened');
    if (!reducedMotion()) burst(art, 'stars', 22);
    loot.forEach((t, i) => {
      const b = blockImg(t);
      b.style.animationDelay = `${i * 150}ms`;
      items.append(b);
    });
    bumpCounter();
    if (friend) {
      const key = h('span', { class: 'key-loot', html: KEY_SVG });
      key.style.animationDelay = `${loot.length * 150}ms`;
      items.append(key, h('span', { class: 'key-friend', html: heroSVG(friend, 'all', 56, 'idle') }));
    }
    done.hidden = false;
    const names = [...new Set(specials)].map((t) => BLOCK_NAMES[t]);
    await ctx.say(`Des blocs spéciaux pour ta maison : ${names.join(', et ')} ! Et de l'or !`);
    if (friend && overlay.isConnected && ctx.alive()) await ctx.say(`Et une clé ! ${friend.name} t'a préparé un jeu. Va voir tes amis pour jouer !`);
  };
  art.onclick = () => void open();
  done.onclick = () => {
    overlay.remove();
    softEnd(ctx, then);
  };
  void ctx.say("Bravo, tu as fini l'aventure du jour ! Touche le coffre pour l'ouvrir !");
  setTimeout(() => {
    if (overlay.isConnected && ctx.alive()) void open();
  }, 6000);
}

const KEY_SVG =
  '<svg viewBox="0 0 12 6" width="64" height="32" shape-rendering="crispEdges" aria-label="Une clé"><path d="M1 1h3v1h1v2h-1v1h-3v-1h-1v-2h1z" fill="#f7c843" stroke="#3b2412" stroke-width=".4"/><rect x="2" y="2" width="1" height="2" fill="#3b2412"/><rect x="5" y="2" width="6" height="2" fill="#f7c843"/><rect x="8" y="4" width="1" height="1" fill="#f7c843"/><rect x="10" y="4" width="1" height="2" fill="#f7c843"/></svg>';

/** After the chest: « À demain ? ». Stopping is offered first; « Encore un peu » goes on (`then`). */
function softEnd(ctx: Ctx, then: () => void): void {
  const speech = "Tu as bien travaillé aujourd'hui ! À demain ?";
  const bye = h('button', { class: 'btn big green' }, h('span', { class: 'btn-fox', html: foxSVG(40, true) }), 'À demain !');
  bye.onclick = () => ctx.go('rest');
  const more = h('button', { class: 'btn big' }, h('span', { html: HOUSE_SVG }), 'Encore un peu');
  more.onclick = () => {
    overlay.remove();
    then();
  };
  const panel = h(
    'div',
    { class: 'panel hero-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'À demain ?' },
    h('div', { class: 'hero' }, mascot(110, () => void ctx.say(speech)), bubble('À demain ?')),
    h('div', { class: 'actions' }, bye, more),
  );
  const overlay = h('div', { class: 'overlay hero-overlay' }, panel);
  document.body.append(overlay);
  void ctx.say(speech);
}

/** The adventure is over for today: Pixel goes to sleep. The house button still leads home. */
export function restScreen(ctx: Ctx): void {
  const speech = 'Pixel va faire une sieste. Reviens demain pour un nouveau coffre.';
  const fox = h('button', { class: 'fox-btn sleeping', 'aria-label': 'Pixel dort', html: foxSVG(160, true) });
  fox.onclick = () => {
    sfx.unlock();
    void ctx.say(speech);
  };
  ctx.root.append(
    h(
      'main',
      { class: 'screen pause' },
      topBar(() => ctx.go('home')),
      h('div', { class: 'zzz', 'aria-hidden': 'true' }, 'Z z z'),
      h('div', { class: 'hero' }, fox, bubble('À demain !')),
      h('div', { class: 'ground' }),
    ),
  );
  void ctx.say(speech);
}

/** Small strip showing today's adventure: three activities and the chest. */
export function missionStrip(): HTMLElement {
  const m = mission();
  const strip = h('div', { class: 'mission-strip', 'aria-hidden': 'true' });
  const icons: Record<ActivityId, string> = { sounds: 'a', write: '✎', count: '3' };
  for (const a of ACTIVITIES) {
    strip.append(h('span', { class: `m-step m-${a}${m.done.includes(a) ? ' done' : ''}`, title: ACTIVITY_NAMES[a] }, m.done.includes(a) ? '✔' : icons[a]));
  }
  strip.append(h('span', { class: `m-chest${m.chest ? ' open' : ''}`, html: chestSVG(44, m.chest) }));
  return strip;
}
