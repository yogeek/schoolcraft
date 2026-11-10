// Several children on the same device: each one has an avatar (a hero) and their own save.
// The child picks their avatar (no reading needed); the parents name the children.
import { sfx } from '../audio';
import { HEROES } from '../content/heroes';
import { heroSVG } from '../heroArt';
import { addProfile, currentProfile, MAX_PROFILES, profileName, profiles, removeProfile, saveProfiles, switchProfile, type Profile } from '../state';
import { h, modal } from '../ui';
import type { Ctx } from './types';

export function avatarSVG(p: Profile, size: number): string {
  return heroSVG(HEROES[p.avatar % HEROES.length], 'all', size);
}

const ASKED = 'schoolcraft:who';

/**
 * Ask "who is playing?" once per visit, when there are several children. `then` runs once the
 * child playing now is confirmed (picking another child reloads the app on their save instead).
 * Returns false when nothing was asked.
 */
export function askWhoOnce(then?: () => void): boolean {
  try {
    if (profiles.list.length < 2 || sessionStorage.getItem(ASKED)) return false;
    sessionStorage.setItem(ASKED, '1');
  } catch {
    return false;
  }
  pickChild(then);
  return true;
}

/** "Who is playing?" (only shown when there are several children). */
export function pickChild(then?: () => void): void {
  const list = h('div', { class: 'who-list' });
  for (const p of profiles.list) {
    const b = h('button', { class: `who${p.id === profiles.current ? ' current' : ''}`, 'aria-label': profileName(p) }, h('span', { class: 'who-art', html: avatarSVG(p, 72) }), h('span', { class: 'who-name' }, profileName(p)));
    b.onclick = () => {
      sfx.tap();
      if (p.id === profiles.current) {
        dlg.close();
        then?.();
      } else switchProfile(p.id);
    };
    list.append(b);
  }
  // with something to do next, a tap beside the dialog must not skip it
  const dlg = modal({ title: 'Qui joue ?', body: [list], actions: [], cls: 'who-panel', dismissable: !then });
}

/** Avatar of the child playing, in the home top bar. */
export function whoButton(): HTMLElement | null {
  if (profiles.list.length < 2) return null;
  const p = currentProfile();
  const b = h('button', { class: 'who-btn', 'aria-label': `${profileName(p)} : changer d'enfant`, html: avatarSVG(p, 40) });
  b.onclick = () => {
    sfx.unlock();
    sfx.tap();
    pickChild();
  };
  return b;
}

/** Parents' card: name the children, pick their avatar, add or remove a child. */
export function childrenCard(ctx: Ctx): HTMLElement {
  const rows = h('div', { class: 'children' });
  for (const p of profiles.list) {
    const art = h('button', { class: 'who-btn', 'aria-label': 'Changer d’avatar', html: avatarSVG(p, 40) });
    art.onclick = () => {
      p.avatar = (p.avatar + 1) % HEROES.length;
      saveProfiles();
      art.innerHTML = avatarSVG(p, 40);
    };
    const name = h('input', { type: 'text', value: p.name, placeholder: profileName(p), maxlength: '20', 'aria-label': 'Prénom', class: 'child-name' });
    name.addEventListener('change', () => {
      p.name = name.value.trim().slice(0, 20);
      saveProfiles();
    });
    const row = h('div', { class: 'child' }, art, name);
    if (p.id === profiles.current) row.append(h('span', { class: 'muted' }, 'joue en ce moment'));
    else {
      const play = h('button', { class: 'btn small' }, 'Jouer');
      play.onclick = () => switchProfile(p.id);
      const del = h('button', { class: 'btn small danger' }, 'Supprimer');
      del.onclick = () =>
        modal({
          title: `Supprimer ${profileName(p)} ?`,
          body: [h('p', {}, 'Toute sa progression sera effacée de cet appareil. On ne peut pas revenir en arrière.')],
          actions: [
            { label: 'Annuler' },
            {
              label: 'Supprimer',
              cls: 'danger',
              onClick: () => {
                removeProfile(p.id);
                ctx.go('parents');
              },
            },
          ],
        });
      row.append(play, del);
    }
    rows.append(row);
  }
  const add = h('button', { class: 'btn small green' }, 'Ajouter un enfant');
  add.disabled = profiles.list.length >= MAX_PROFILES;
  add.onclick = () => {
    if (addProfile()) ctx.go('parents');
  };
  return h(
    'section',
    { class: 'card' },
    h('h2', {}, 'Enfants'),
    rows,
    add,
    h('p', { class: 'muted' }, `Chaque enfant a sa propre progression (${MAX_PROFILES} au plus). Touchez un avatar pour le changer. Avec plusieurs enfants, l’accueil demande « Qui joue ? ».`),
  );
}
