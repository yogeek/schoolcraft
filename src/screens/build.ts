// Mode construction « Ma maison » : l'enfant pose les blocs gagnés sur une grille (vue de côté),
// au-dessus d'un sol décoratif. Toucher un bloc posé le reprend. Sauvegardé sur l'appareil.
// Pixel propose aussi un défi (challenge.ts) : une tour d'un nombre donné de blocs, un motif à
// recopier ou à continuer. Le modèle s'affiche dans sa bulle ; l'enfant construit dans sa maison.
import { sfx } from '../audio';
import { columnRun, freshTower, NUMBER_WORDS as W, nextChallenge, solved, wrongPattern, type Planned } from '../challenge';
import { burst } from '../heroArt';
import { BLOCK_NAMES, blockTexture, ofBlock } from '../pixel';
import { BLOCK_TYPES, save, SPECIAL_BLOCKS, state, WORLD_COLS, WORLD_ROWS, type BlockType } from '../state';
import { blockImg, bubble, setBubble, bumpCounter, h, mascot, modal, reducedMotion, topBar } from '../ui';
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

  // ---------------------------------------------------------------- Pixel's challenge
  let ch: Planned | null = nextChallenge();
  let won = false;
  /** cells placed since the challenge started ("r,c") */
  const fresh = new Set<string>();
  let talk = 0; // latest spoken line; an older sequence (naming the model) stops
  /** Any other line: it stops Pixel naming the model, which would talk over it. */
  const say = (text: string) => {
    talk++;
    return ctx.say(text);
  };
  let toldHeight = 0;
  /** wrong patterns so far (help grows: the pattern again, then the answer in the « ? » slots) */
  let misses = 0;
  let toldWrong = '';
  const model = h('div', { class: 'model', 'aria-hidden': 'true' });
  const fox = mascot(70, () => void (ch && !won ? sayChallenge() : say(instructions)));

  function renderModel(): void {
    if (!ch || won) return setBubble(bub, won ? 'Bravo !' : 'Construis ta maison !');
    if (ch.kind === 'tower') model.replaceChildren(h('span', { class: 'model-n' }, String(ch.n)), blockImg('grass', 'block mini'));
    else {
      const rest = ch.goal.slice(ch.model.length);
      // after two wrong tries the « ? » show the blocks that come next
      model.replaceChildren(...ch.model.map((t) => blockImg(t, 'block mini')), ...rest.map((t) => (misses >= 2 ? blockImg(t, 'block mini shown') : h('span', { class: 'model-slot' }, '?'))));
    }
    // a caption for the adult who watches (the child hears it)
    const caption = ch.kind === 'tower' ? `Une tour de ${ch.n} blocs` : ch.goal.length > ch.model.length ? 'Recopie et trouve la suite' : 'Recopie ce motif';
    bub.replaceChildren(model, h('span', { class: 'model-cap' }, caption));
    bub.setAttribute('aria-label', challengeText());
  }

  function challengeText(): string {
    if (!ch) return '';
    if (ch.kind === 'tower') return `Construis une tour de ${W[ch.n]} blocs !`;
    return ch.goal.length > ch.model.length ? 'Recopie ce motif, puis trouve la suite !' : 'Recopie ce motif !';
  }

  /** Say the challenge (or `first`); a pattern is named block by block, each one lighting up. */
  async function sayChallenge(first = challengeText()): Promise<void> {
    if (!ch) return;
    const my = ++talk;
    await ctx.say(first);
    if (ch.kind !== 'pattern') return;
    const imgs = [...model.querySelectorAll('img')];
    const named = misses >= 2 ? ch.goal : ch.model;
    for (const [i, t] of named.entries()) {
      if (my !== talk || !ctx.alive()) return;
      imgs[i]?.classList.add('lit');
      await ctx.say(BLOCK_NAMES[t].replace(/^./, (x) => x.toUpperCase()));
      imgs[i]?.classList.remove('lit');
    }
    // the « ? » blink while Pixel asks what comes next
    if (my !== talk || !ctx.alive() || ch.goal.length <= ch.model.length || misses >= 2) return;
    const slots = [...model.querySelectorAll('.model-slot')];
    slots.forEach((el) => el.classList.add('lit'));
    await ctx.say("Et après, qu'est-ce qui vient ? À toi de trouver la suite !");
    slots.forEach((el) => el.classList.remove('lit'));
  }

  let checking = 0;
  function check(r: number, c: number, put: boolean): void {
    if (!ch || won) return;
    // judged once the child stops for a moment: stacking without counting must not pass by luck
    const my = ++checking;
    void ctx.wait(2000).then((ok) => {
      if (!ok || my !== checking || !ch || won) return;
      if (solved(ch, fresh)) return win();
      if (ch.kind === 'tower') {
        // the child stopped too early: count the tower with them
        const height = freshTower(fresh);
        if (height > 0 && height < ch.n && height !== toldHeight) {
          toldHeight = height;
          void say(`${height === 1 ? 'Ta tour a un bloc.' : `Ta tour a ${W[height]} blocs.`} Il en faut ${W[ch.n]}.`);
        }
        return;
      }
      // a finished row that is not the pattern: the pattern again, then the answer
      const wrong = wrongPattern(ch, fresh);
      if (!wrong || wrong === toldWrong) return;
      toldWrong = wrong;
      misses++;
      sfx.oops();
      renderModel();
      void sayChallenge(misses >= 2 ? 'Regarde bien le motif en entier !' : 'Pas tout à fait. Écoute bien le motif !');
    });
    // a tower that grew too tall: count it for the child (once per height)
    if (ch.kind === 'tower' && put) {
      const { top, bottom } = columnRun(r, c);
      const height = bottom - top + 1;
      if (height > ch.n && height !== toldHeight && height < W.length) {
        toldHeight = height;
        void say(`Ta tour a ${W[height]} blocs. Il en faut ${W[ch.n]}. Touche un bloc posé pour le reprendre.`);
      }
    }
  }

  function win(): void {
    if (!ch) return;
    won = true;
    if (ch.planned) state.challenges++;
    save();
    sfx.fanfare();
    if (!reducedMotion()) burst(fox, 'stars', 16);
    renderModel();
    another.hidden = false;
    const my = talk + 1;
    const praise = ch.kind === 'tower' ? `Bravo ! Une tour de ${W[ch.n]} blocs !` : 'Bravo, tu as réussi le défi !';
    void say(praise).then(() => (ctx.alive() && won && my === talk ? ctx.say("Touche l'étoile pour un nouveau défi !") : undefined));
  }

  // a new challenge (shown after a success)
  const another = h('button', { class: 'btn star-btn', 'aria-label': 'Un nouveau défi' }, '★');
  another.hidden = true;
  another.onclick = () => {
    sfx.tap();
    ch = nextChallenge();
    won = false;
    fresh.clear();
    toldHeight = 0;
    misses = 0;
    toldWrong = '';
    another.hidden = true;
    renderModel();
    if (ch) void sayChallenge();
    else void say("Tu n'as plus de blocs. Joue à lire ou à compter pour en gagner !");
  };

  function tapCell(r: number, c: number): void {
    sfx.unlock();
    const current = state.world[r][c];
    if (current) {
      // pick the block back into the inventory
      state.world[r][c] = null;
      state.inventory[current]++;
      fresh.delete(`${r},${c}`);
      selected ??= current;
      sfx.tap();
    } else {
      if (!selected || state.inventory[selected] <= 0) {
        sfx.oops();
        setBubble(bub, 'Plus de blocs !');
        void say("Tu n'as plus de blocs. Joue à lire ou à compter pour en gagner !");
        return;
      }
      state.world[r][c] = selected;
      state.inventory[selected]--;
      fresh.add(`${r},${c}`);
      sfx.place();
      cellEls[r][c].animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.1)' }, { transform: 'scale(1)' }], { duration: 200 });
      if (state.inventory[selected] === 0) selected = BLOCK_TYPES.find((t) => state.inventory[t] > 0) ?? null;
    }
    save();
    renderCell(r, c);
    renderPalette();
    bumpCounter();
    check(r, c, !current);
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
    tidy.disabled = placed() === 0;
  }

  // put every placed block back in the inventory (asks first: the house disappears)
  const tidy = h('button', { class: 'btn tidy' }, 'Tout ranger');
  tidy.onclick = () => {
    sfx.tap();
    void say('Tu veux ranger tous les blocs ? Ta maison va disparaître.');
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
            void say('Tout est rangé !');
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
      h('div', { class: 'hero small' }, fox, bub),
      h('div', { class: 'world-wrap' }, h('div', { class: 'world-frame' }, grid, h('div', { class: 'world-ground', 'aria-hidden': 'true' }))),
      palette,
      h('div', { class: 'build-actions' }, another, tidy),
    ),
  );

  renderModel();
  // an empty house: how to build first; then Pixel's challenge
  if (placed() === 0 || !ch) void ctx.say(instructions).then(() => (ctx.alive() && ch ? sayChallenge() : undefined));
  else void sayChallenge();
}
