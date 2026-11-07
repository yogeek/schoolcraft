// Espace parents (protégé par une multiplication) : niveaux, progrès, temps de jeu, remise à zéro.
// Écran « Pause » quand le temps de jeu choisi est écoulé.
import { sfx } from '../audio';
import { HEROES } from '../content/heroes';
import { currentLevel, LEVEL_NAMES, MAX_LEVEL, parentSetLevel, unlockedLevel } from '../levels';
import { foxSVG } from '../pixel';
import { playedMinutes, resetPlayClock } from '../playtime';
import { resetAll, save, state, totalBlocks, type ActivityId } from '../state';
import { bubble, h, modal, topBar } from '../ui';
import type { Ctx } from './types';

/** Simple gate so a young child does not wander in: a multiplication from the times tables. */
export function parentGate(onOk: () => void): void {
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  const input = h('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', 'aria-label': `Résultat de ${a} fois ${b}`, class: 'gate-input', maxlength: '3' });
  const msg = h('p', { class: 'gate-msg', role: 'alert' }, '');
  const check = () => {
    if (Number(input.value.trim()) === a * b) {
      dlg.close();
      onOk();
      return true;
    }
    msg.textContent = input.value.trim() ? 'Ce n’est pas la bonne réponse.' : 'Tapez le résultat.';
    input.select();
    return false;
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') check();
  });
  const dlg = modal({
    title: 'Espace parents',
    body: [h('p', { class: 'gate-q' }, `Combien font ${a}\u00a0×\u00a0${b}\u00a0?`), input, msg],
    actions: [
      { label: 'Annuler' },
      {
        label: 'Entrer',
        cls: 'green',
        onClick: () => {
          check(); // closes the dialog itself when the answer is right
          return false;
        },
      },
    ],
  });
  setTimeout(() => input.focus(), 50);
}

const LIMITS = [0, 10, 15, 20, 30, 45];

export function parentsScreen(ctx: Ctx): void {
  const section = (activity: ActivityId, title: string, prefix: string) => {
    const select = h('select', { 'aria-label': `Niveau ${title}` });
    LEVEL_NAMES[activity].forEach((name, i) => {
      const opt = h('option', { value: String(i + 1) }, `${i + 1}. ${name}`);
      if (i + 1 === currentLevel(activity)) opt.selected = true;
      select.append(opt);
    });
    const info = h('p', { class: 'muted' }, `Niveau le plus haut atteint : ${unlockedLevel(activity)} sur ${MAX_LEVEL[activity]}`);
    const saved = h('span', { class: 'saved', role: 'status' }, '');
    select.onchange = () => {
      parentSetLevel(activity, Number(select.value));
      info.textContent = `Niveau le plus haut atteint : ${unlockedLevel(activity)} sur ${MAX_LEVEL[activity]}`;
      saved.textContent = '✓ enregistré';
    };

    // what the child knows: red = à revoir first, then orange = en cours, then green = acquis
    const chips = h('div', { class: 'chips' });
    const entries = Object.entries(state.stats)
      .filter(([k]) => k.startsWith(prefix))
      .sort(([ka, a], [kb, b]) => a.box - b.box || ka.localeCompare(kb, 'fr', { numeric: true }));
    for (const [k, s] of entries) {
      const label = k.slice(prefix.length).replace(/^(count|flash|add):/, (m) => ({ 'count:': '', 'flash:': '👁 ', 'add:': '= ' })[m] ?? '');
      chips.append(h('span', { class: `chip box${s.box}`, title: `${s.ok} réussi(s), ${s.ko} raté(s)` }, label));
    }
    if (!entries.length) chips.append(h('span', { class: 'muted' }, 'Pas encore joué.'));

    return h(
      'section',
      { class: 'card' },
      h('h2', {}, title),
      h('label', { class: 'field' }, 'Niveau joué ', select, ' ', saved),
      info,
      h('h3', {}, 'Ce qui a été travaillé'),
      chips,
    );
  };

  // play-time limit
  const limit = h('select', { 'aria-label': 'Temps de jeu' });
  for (const m of LIMITS) {
    const opt = h('option', { value: String(m) }, m === 0 ? 'Pas de limite' : `${m} minutes`);
    if (m === state.settings.limitMin) opt.selected = true;
    limit.append(opt);
  }
  const playInfo = h('p', { class: 'muted' }, `Temps joué dans cette séance : ${playedMinutes()} min.`);
  const limitSaved = h('span', { class: 'saved', role: 'status' }, '');
  limit.onchange = () => {
    state.settings.limitMin = Number(limit.value);
    save();
    limitSaved.textContent = '✓ enregistré';
  };
  const restart = h('button', { class: 'btn small' }, 'Remettre le compteur à zéro');
  restart.onclick = () => {
    resetPlayClock();
    playInfo.textContent = 'Temps joué dans cette séance : 0 min.';
  };

  const reset = h('button', { class: 'btn danger' }, 'Tout effacer');
  reset.onclick = () =>
    modal({
      title: 'Tout effacer ?',
      body: [h('p', {}, 'Les blocs, la maison, les héros coloriés et les niveaux seront effacés. Les réglages sont gardés.')],
      actions: [
        { label: 'Annuler' },
        {
          label: 'Effacer',
          cls: 'danger',
          onClick: () => {
            resetAll();
            ctx.go('home');
          },
        },
      ],
    });

  const done = state.heroes.done.length;
  ctx.root.append(
    h(
      'main',
      { class: 'screen parents-screen' },
      topBar(() => ctx.go('home'), 'Parents'),
      h(
        'div',
        { class: 'cards' },
        h(
          'section',
          { class: 'card' },
          h('h2', {}, 'En bref'),
          h('p', {}, `Blocs en réserve : ${totalBlocks()} · Héros réveillés : ${done} sur ${HEROES.length}`),
          h(
            'p',
            { class: 'muted' },
            "Chaque bonne réponse rapporte un bloc ; les blocs servent à colorier les héros et à construire la maison. Un niveau se débloque quand l'enfant réussit 80 % des réponses du premier coup. Pastilles : ",
            h('span', { class: 'chip box3' }, 'acquis'),
            ' ',
            h('span', { class: 'chip box2' }, 'en cours'),
            ' ',
            h('span', { class: 'chip box1' }, 'à revoir'),
          ),
        ),
        h(
          'section',
          { class: 'card' },
          h('h2', {}, 'Temps de jeu'),
          h('label', { class: 'field' }, 'Pause au bout de ', limit, ' ', limitSaved),
          h('p', { class: 'muted' }, 'Quand le temps est écoulé, Pixel propose une pause. Le compteur repart à zéro après 30 minutes sans jouer.'),
          playInfo,
          restart,
        ),
        section('sounds', 'Lire', 'snd:'),
        section('count', 'Compter', 'count:'),
        h('section', { class: 'card' }, h('h2', {}, 'Réinitialiser'), h('p', { class: 'muted' }, 'Efface les blocs, la maison, les héros et les niveaux.'), reset),
      ),
    ),
  );
}

/** Time is up: a calm screen. Only a parent can start again. */
export function pauseScreen(ctx: Ctx): void {
  const speech = "C'est l'heure de faire une pause ! Pixel va faire une sieste. Reviens jouer plus tard !";
  const fox = h('button', { class: 'fox-btn sleeping', 'aria-label': 'Pixel dort', html: foxSVG(160, true) });
  fox.onclick = () => {
    sfx.unlock();
    void ctx.say(speech);
  };
  const parents = h('button', { class: 'btn' }, 'Parents');
  parents.onclick = () =>
    parentGate(() => {
      resetPlayClock();
      ctx.go('home');
    });
  ctx.root.append(
    h(
      'main',
      { class: 'screen pause' },
      h('div', { class: 'topbar' }),
      h('div', { class: 'zzz', 'aria-hidden': 'true' }, 'Z z z'),
      h('div', { class: 'hero' }, fox, bubble("C'est l'heure de la pause !")),
      h('p', { class: 'pause-note' }, 'Le temps de jeu choisi est terminé.'),
      parents,
      h('div', { class: 'ground' }),
    ),
  );
  void ctx.say(speech);
}
