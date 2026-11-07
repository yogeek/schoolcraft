// L'aventure du jour : une partie de Lire, d'Écrire et de Compter. Quand les trois sont faites, un
// coffre s'ouvre avec des blocs spéciaux (briques, feuilles, fleurs, cristal) pour la maison.
// Pas de série à ne pas casser : un jour sans jeu ne fait rien perdre.
import { sfx } from '../audio';
import { burst } from '../heroArt';
import { ACTIVITY_NAMES } from '../levels';
import { BLOCK_NAMES, chestSVG } from '../pixel';
import { ACTIVITIES, mission, save, SPECIAL_BLOCKS, state, type ActivityId, type BlockType } from '../state';
import { blockImg, bumpCounter, h, reducedMotion, shuffle } from '../ui';
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
    done.hidden = false;
    const names = [...new Set(specials)].map((t) => BLOCK_NAMES[t]);
    await ctx.say(`Des blocs spéciaux pour ta maison : ${names.join(', et ')} ! Et de l'or !`);
  };
  art.onclick = () => void open();
  done.onclick = () => {
    overlay.remove();
    then();
  };
  void ctx.say("Bravo, tu as fini l'aventure du jour ! Touche le coffre pour l'ouvrir !");
  setTimeout(() => {
    if (overlay.isConnected && ctx.alive()) void open();
  }, 6000);
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
