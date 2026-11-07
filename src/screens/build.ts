// Mode construction « Ma maison » : l'enfant pose les blocs gagnés sur une grille (vue de côté),
// au-dessus d'un sol décoratif. Toucher un bloc posé le reprend. Sauvegardé sur l'appareil.
import { sfx } from '../audio';
import { BLOCK_NAMES, blockTexture, ofBlock } from '../pixel';
import { BLOCK_TYPES, save, SPECIAL_BLOCKS, state, WORLD_COLS, WORLD_ROWS, type BlockType } from '../state';
import { blockImg, bubble, setBubble, bumpCounter, h, mascot, modal, topBar } from '../ui';
import type { Ctx } from './types';

export function buildScreen(ctx: Ctx): void {
  let selected: BlockType | null = BLOCK_TYPES.find((t) => state.inventory[t] > 0) ?? null;

  const grid = h('div', { class: 'world', role: 'grid', 'aria-label': 'Ma maison' });
  grid.style.setProperty('--cols', String(WORLD_COLS));
  grid.style.setProperty('--rows', String(WORLD_ROWS));
  const palette = h('div', { class: 'palette' });
  const bub = bubble('Construis ta maison !');
  const cellEls: HTMLElement[][] = [];
  const instructions = 'Choisis un bloc en bas, puis touche le ciel pour le poser ! Touche un bloc posé pour le reprendre.';

  function renderCell(r: number, c: number): void {
    const cell = cellEls[r][c];
    const t = state.world[r][c];
    cell.style.backgroundImage = t ? `url(${blockTexture(t)})` : '';
    cell.classList.toggle('filled', !!t);
    cell.classList.toggle('glass', t === 'glass');
    cell.setAttribute('aria-label', t ? `bloc ${BLOCK_NAMES[t]}` : 'vide');
  }

  for (let r = 0; r < WORLD_ROWS; r++) {
    cellEls.push([]);
    for (let c = 0; c < WORLD_COLS; c++) {
      const cell = h('button', { class: 'cell' });
      cell.onclick = () => tapCell(r, c);
      cellEls[r].push(cell);
      grid.append(cell);
      renderCell(r, c);
    }
  }

  const placed = () => state.world.reduce((n, row) => n + row.filter(Boolean).length, 0);

  function tapCell(r: number, c: number): void {
    sfx.unlock();
    const current = state.world[r][c];
    if (current) {
      // pick the block back into the inventory
      state.world[r][c] = null;
      state.inventory[current]++;
      selected ??= current;
      sfx.tap();
    } else {
      if (!selected || state.inventory[selected] <= 0) {
        sfx.oops();
        setBubble(bub, 'Plus de blocs !');
        void ctx.say("Tu n'as plus de blocs. Joue à lire ou à compter pour en gagner !");
        return;
      }
      state.world[r][c] = selected;
      state.inventory[selected]--;
      sfx.place();
      cellEls[r][c].animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 200 });
      if (state.inventory[selected] === 0) selected = BLOCK_TYPES.find((t) => state.inventory[t] > 0) ?? null;
    }
    save();
    renderCell(r, c);
    renderPalette();
    bumpCounter();
  }

  function renderPalette(): void {
    // special blocks (from the daily chest) appear once the child has some
    palette.replaceChildren(
      ...BLOCK_TYPES.filter((t) => state.inventory[t] > 0 || !(SPECIAL_BLOCKS as readonly string[]).includes(t)).map((t) => {
        const n = state.inventory[t];
        const b = h('button', { class: `slot${t === selected ? ' selected' : ''}${n === 0 ? ' empty' : ''}`, 'aria-label': `${BLOCK_NAMES[t]} : ${n}` }, blockImg(t), h('span', { class: 'qty' }, String(n)));
        b.onclick = () => {
          sfx.tap();
          if (n === 0) {
            void ctx.say(`Tu n'as pas encore de blocs ${ofBlock(t)}.`);
            return;
          }
          selected = t;
          void ctx.say(BLOCK_NAMES[t]);
          renderPalette();
        };
        return b;
      }),
    );
    tidy.disabled = placed() === 0;
  }

  // put every placed block back in the inventory (asks first: the house disappears)
  const tidy = h('button', { class: 'btn tidy' }, 'Tout ranger');
  tidy.onclick = () => {
    sfx.tap();
    void ctx.say('Tu veux ranger tous les blocs ? Ta maison va disparaître.');
    modal({
      title: 'Tout ranger ?',
      body: [h('p', { class: 'muted center' }, 'Les blocs reviennent dans ta réserve.')],
      actions: [
        {
          label: 'Oui, ranger',
          cls: 'danger',
          onClick: () => {
            for (let r = 0; r < WORLD_ROWS; r++)
              for (let c = 0; c < WORLD_COLS; c++) {
                const t = state.world[r][c];
                if (t) state.inventory[t]++;
                state.world[r][c] = null;
                renderCell(r, c);
              }
            save();
            selected = BLOCK_TYPES.find((t) => state.inventory[t] > 0) ?? null;
            renderPalette();
            bumpCounter();
            void ctx.say('Tout est rangé !');
          },
        },
        { label: 'Non', cls: 'green' },
      ],
    });
  };

  renderPalette();

  ctx.root.append(
    h(
      'main',
      { class: 'screen build' },
      topBar(() => ctx.go('home'), 'Ma maison'),
      h('div', { class: 'hero small' }, mascot(70, () => void ctx.say(instructions)), bub),
      h('div', { class: 'world-wrap' }, h('div', { class: 'world-frame' }, grid, h('div', { class: 'world-ground', 'aria-hidden': 'true' }))),
      palette,
      h('div', { class: 'build-actions' }, tidy),
    ),
  );

  void ctx.say(instructions);
}
