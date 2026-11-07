// Mode construction : l'enfant pose les blocs gagnés sur une grille (vue de côté). Sauvegardé sur l'appareil.
import { say, sfx } from '../audio';
import { BLOCK_NAMES, blockTexture, ofBlock } from '../pixel';
import { BLOCK_TYPES, save, state, WORLD_COLS, WORLD_ROWS, type BlockType } from '../state';
import { blockImg, h, topBar } from '../ui';
import type { Ctx } from './types';

export function buildScreen(ctx: Ctx): void {
  let selected: BlockType | null = BLOCK_TYPES.find((t) => state.inventory[t] > 0) ?? null;

  const grid = h('div', { class: 'world', role: 'grid' });
  grid.style.setProperty('--cols', String(WORLD_COLS));
  grid.style.setProperty('--rows', String(WORLD_ROWS));
  const palette = h('div', { class: 'palette' });

  function renderCell(r: number, c: number, cell: HTMLElement): void {
    const t = state.world[r][c];
    cell.style.backgroundImage = t ? `url(${blockTexture(t)})` : '';
    cell.classList.toggle('filled', !!t);
    cell.classList.toggle('glass', t === 'glass');
  }

  for (let r = 0; r < WORLD_ROWS; r++) {
    for (let c = 0; c < WORLD_COLS; c++) {
      const cell = h('button', { class: 'cell', 'aria-label': `case ${r + 1}-${c + 1}` });
      renderCell(r, c, cell);
      cell.onclick = () => tapCell(r, c, cell);
      grid.append(cell);
    }
  }

  function tapCell(r: number, c: number, cell: HTMLElement): void {
    sfx.unlock();
    const current = state.world[r][c];
    if (current) {
      // pick the block back into the inventory
      state.world[r][c] = null;
      state.inventory[current]++;
      sfx.tap();
    } else {
      if (!selected || state.inventory[selected] <= 0) {
        sfx.oops();
        void say("Tu n'as plus de blocs. Joue à lire ou à compter pour en gagner !");
        return;
      }
      state.world[r][c] = selected;
      state.inventory[selected]--;
      sfx.place();
      cell.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 200 });
      if (state.inventory[selected] === 0) selected = BLOCK_TYPES.find((t) => state.inventory[t] > 0) ?? null;
    }
    save();
    renderCell(r, c, cell);
    renderPalette();
  }

  function renderPalette(): void {
    palette.replaceChildren(
      ...BLOCK_TYPES.map((t) => {
        const n = state.inventory[t];
        const b = h('button', { class: `slot${t === selected ? ' selected' : ''}${n === 0 ? ' empty' : ''}`, 'aria-label': BLOCK_NAMES[t] }, blockImg(t), h('span', { class: 'qty' }, String(n)));
        b.onclick = () => {
          sfx.tap();
          if (n === 0) {
            void say(`Tu n'as pas encore de blocs ${ofBlock(t)}.`);
            return;
          }
          selected = t;
          void say(BLOCK_NAMES[t]);
          renderPalette();
        };
        return b;
      }),
    );
  }
  renderPalette();

  ctx.root.append(
    h(
      'main',
      { class: 'screen build' },
      topBar(() => ctx.go('home'), 'Ma maison'),
      h('div', { class: 'world-wrap' }, grid),
      palette,
    ),
  );

  void say('Choisis un bloc en bas, puis touche le ciel pour le poser !');
}
