// Espace parents : choisir le niveau de départ, voir les progrès, tout effacer.
import { parentSetLevel, unlockedLevel, currentLevel } from '../levels';
import { resetAll, state, type ActivityId } from '../state';
import { h, topBar } from '../ui';
import { COUNT_LEVEL_NAMES } from './count';
import { SOUNDS_LEVEL_NAMES } from './sounds';
import type { Ctx } from './types';

/** Simple gate so a 5-year-old does not wander in. */
export function parentGate(onOk: () => void): void {
  const a = 6 + Math.floor(Math.random() * 4);
  const b = 6 + Math.floor(Math.random() * 4);
  const ans = window.prompt(`Espace parents — combien font ${a} × ${b} ?`);
  if (ans !== null && Number(ans.trim()) === a * b) onOk();
}

export function parentsScreen(ctx: Ctx): void {
  const section = (activity: ActivityId, title: string, names: string[], prefix: string) => {
    const select = h('select', { 'aria-label': `Niveau ${title}` });
    names.forEach((name, i) => {
      const opt = h('option', { value: String(i + 1) }, `${i + 1}. ${name}`);
      if (i + 1 === currentLevel(activity)) opt.selected = true;
      select.append(opt);
    });
    const info = h('p', { class: 'muted' }, `Niveau le plus haut atteint : ${unlockedLevel(activity)}`);
    const saved = h('span', { class: 'saved' }, '');
    select.onchange = () => {
      parentSetLevel(activity, Number(select.value));
      info.textContent = `Niveau le plus haut atteint : ${unlockedLevel(activity)}`;
      saved.textContent = '✓ enregistré';
    };

    // what the child knows: green = acquis, orange = en cours, red = à revoir
    const chips = h('div', { class: 'chips' });
    const entries = Object.entries(state.stats).filter(([k]) => k.startsWith(prefix));
    for (const [k, s] of entries) {
      const label = k.slice(prefix.length).replace(/^(count|flash|add):/, (m) => ({ 'count:': '', 'flash:': '👁 ', 'add:': '+ ' })[m] ?? '');
      chips.append(h('span', { class: `chip box${s.box}`, title: `${s.ok} réussi(s), ${s.ko} raté(s)` }, label));
    }
    if (!entries.length) chips.append(h('span', { class: 'muted' }, 'Pas encore joué.'));

    return h(
      'section',
      { class: 'card' },
      h('h2', {}, title),
      h('label', {}, 'Niveau joué ', select, ' ', saved),
      info,
      h('h3', {}, 'Ce qui est vu'),
      chips,
    );
  };

  const reset = h('button', { class: 'btn danger' }, 'Tout effacer');
  reset.onclick = () => {
    if (window.confirm('Effacer les blocs, la maison et toute la progression ?')) {
      resetAll();
      ctx.go('home');
    }
  };

  ctx.root.append(
    h(
      'main',
      { class: 'screen parents-screen' },
      topBar(() => ctx.go('home'), 'Parents'),
      h(
        'div',
        { class: 'cards' },
        h(
          'p',
          { class: 'card intro' },
          "Un niveau se débloque quand l'enfant réussit 80 % des réponses du premier coup. Vous pouvez aussi choisir directement un niveau ici. Pastilles : ",
          h('span', { class: 'chip box3' }, 'acquis'),
          ' ',
          h('span', { class: 'chip box2' }, 'en cours'),
          ' ',
          h('span', { class: 'chip box1' }, 'à revoir'),
        ),
        section('sounds', 'Lire', SOUNDS_LEVEL_NAMES, 'snd:'),
        section('count', 'Compter', COUNT_LEVEL_NAMES, 'count:'),
        h('section', { class: 'card' }, h('h2', {}, 'Réinitialiser'), h('p', { class: 'muted' }, 'Efface les blocs gagnés, la maison et les niveaux.'), reset),
      ),
    ),
  );
}
