// Espace parents (protégé par une multiplication) : classe, semaine, progrès par compétence,
// idées à faire ensemble, méthode, voix, temps de jeu, remise à zéro.
// Écran « Pause » quand le temps de jeu choisi est écoulé.
import { currentVoice, onVoices, setVoiceChoice, sfx, speechAvailable, voiceChoice, voiceList } from '../audio';
import { HEROES } from '../content/heroes';
import { TIPS } from '../content/tips';
import { ACTIVITY_NAMES, applyGrade, CHAPTERS, chapterOf, currentLevel, GRADE_NAMES, LEVEL_NAMES, MAX_LEVEL, parentSetLevel, unlockedLevel } from '../levels';
import { foxSVG } from '../pixel';
import { playedMinutes, resetPlayClock } from '../playtime';
import { currentProfile, profileName, profiles, resetAll, save, state, today, totalBlocks, type ActivityId, type Grade } from '../state';
import { childrenCard } from './profiles';
import { bubble, h, modal, topBar } from '../ui';
import type { Ctx } from './types';

/** The voice is the device's own: the parents can pick another one and listen to it. */
function voiceCard(ctx: Ctx): HTMLElement {
  const sample = 'Bravo ! Tu as trouvé. Touche le mot : avion.';
  const pick = h('select', { 'aria-label': 'Voix' });
  const using = h('p', { class: 'muted', role: 'status' }, '');
  const fill = () => {
    const list = voiceList();
    pick.replaceChildren(h('option', { value: '' }, 'Automatique (la meilleure trouvée)'));
    for (const v of list) pick.append(h('option', { value: v.id }, v.online ? `${v.label} · en ligne` : v.label));
    pick.value = list.some((v) => v.id === voiceChoice()) ? voiceChoice() : '';
    using.textContent = currentVoice() ? `Voix utilisée : ${currentVoice()}.` : speechAvailable() ? 'Aucune voix française trouvée sur cet appareil.' : 'Ce navigateur ne sait pas parler.';
  };
  fill();
  onVoices(() => {
    if (ctx.alive()) fill();
  });
  pick.onchange = () => {
    setVoiceChoice(pick.value);
    fill();
    void ctx.say(sample);
  };
  const listen = h('button', { class: 'btn small' }, 'Écouter');
  listen.onclick = () => {
    sfx.unlock();
    void ctx.say(sample);
  };
  return h(
    'section',
    { class: 'card' },
    h('h2', {}, 'Voix'),
    h('div', { class: 'grade-row' }, pick, listen),
    using,
    h(
      'p',
      { class: 'muted' },
      'Pixel parle avec la synthèse vocale de l’appareil : la voix change d’un téléphone ou d’un navigateur à l’autre. Pour une voix plus naturelle : sur iPhone ou iPad, Réglages › Accessibilité › Contenu énoncé › Voix › Français, puis téléchargez une voix « améliorée » ou « premium » ; sur Android, installez les voix françaises du moteur « Services vocaux Google » ; sur ordinateur, Chrome propose « Google français » et Edge des voix « Natural ».',
    ),
    h('p', { class: 'muted' }, 'Les voix marquées « en ligne » envoient les phrases de Pixel au service du navigateur pour les prononcer. Ce sont seulement les phrases du jeu, jamais le prénom de l’enfant.'),
  );
}

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

/** Skills shown to the parents, grouped by the stats key prefixes the games use. */
const SKILLS: Record<ActivityId, { label: string; prefixes: string[]; chips?: boolean }[]> = {
  sounds: [
    { label: 'Syllabes à l’oral', prefixes: ['clap:'] },
    { label: 'Rimes', prefixes: ['rime:'] },
    { label: 'Premier son des mots', prefixes: ['onset:'] },
    { label: 'Lettres, sons, syllabes et mots', prefixes: ['snd:'], chips: true },
    { label: 'Écrire avec des lettres (encodage)', prefixes: ['spell:'], chips: true },
    { label: 'Comprendre des phrases', prefixes: ['phrase:', 'devinette:'] },
  ],
  write: [
    { label: 'Capitales', prefixes: ['write:cap:'], chips: true },
    { label: 'Chiffres', prefixes: ['write:dig:'], chips: true },
    { label: 'Cursive', prefixes: ['write:cur:'], chips: true },
  ],
  count: [
    { label: 'Dénombrer', prefixes: ['count:count:'], chips: true },
    { label: 'Reconnaître d’un coup d’œil', prefixes: ['count:flash:', 'count:frame:'], chips: true },
    { label: 'Comparer', prefixes: ['count:compare:', 'count:digits:'] },
    { label: 'La course des nombres (ligne numérique)', prefixes: ['count:race:'] },
    { label: 'Décomposer (la grotte, faire dix)', prefixes: ['count:hide:', 'count:make10:'] },
    { label: 'Additions et problèmes', prefixes: ['count:add:', 'count:problem:'] },
    { label: 'Les nombres de 11 à 20', prefixes: ['count:tens:'], chips: true },
  ],
};

function skillRows(activity: ActivityId): HTMLElement {
  const list = h('div', { class: 'skills' });
  let any = false;
  for (const sk of SKILLS[activity]) {
    const entries = Object.entries(state.stats).filter(([k]) => sk.prefixes.some((p) => k.startsWith(p)));
    if (!entries.length) continue;
    any = true;
    const byBox = [0, 0, 0, 0];
    for (const [, st] of entries) byBox[st.box]++;
    const total = entries.length;
    const bar = h('div', { class: 'skill-bar', role: 'img', 'aria-label': `${byBox[3]} acquis, ${byBox[2]} en cours, ${byBox[1]} à revoir` });
    for (const b of [3, 2, 1]) if (byBox[b]) {
      const seg = h('span', { class: `box${b}` });
      seg.style.flexGrow = String(byBox[b]);
      bar.append(seg);
    }
    const row = h('div', { class: 'skill' }, h('div', { class: 'skill-head' }, h('span', {}, sk.label), h('span', { class: 'muted' }, `${byBox[3]}/${total} acquis`)), bar);
    if (sk.chips) {
      const chips = h('div', { class: 'chips' });
      entries
        .sort(([ka, a], [kb, b]) => a.box - b.box || ka.localeCompare(kb, 'fr', { numeric: true }))
        .forEach(([k, st]) => {
          const label = k.split(':').pop() ?? k;
          chips.append(h('span', { class: `chip box${st.box}`, title: `${st.ok} réussi(s), ${st.ko} raté(s)` }, label));
        });
      row.append(chips);
    }
    list.append(row);
  }
  if (!any) list.append(h('p', { class: 'muted' }, 'Pas encore joué.'));
  return list;
}

function weekCard(): HTMLElement {
  const days: { label: string; min: number; good: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const log = state.history[today(d)];
    days.push({ label: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()], min: Math.round((log?.ms ?? 0) / 60_000), good: log?.good ?? 0 });
  }
  const max = Math.max(10, ...days.map((d) => d.min));
  const chart = h('div', { class: 'week', role: 'img', 'aria-label': days.map((d) => `${d.min} min`).join(', ') });
  for (const d of days) {
    const bar = h('span', { class: 'week-bar' });
    bar.style.height = `${Math.round((d.min / max) * 100)}%`;
    chart.append(h('div', { class: 'week-day' }, h('span', { class: 'week-min' }, d.min ? String(d.min) : ''), h('div', { class: 'week-col' }, bar), h('span', {}, d.label)));
  }
  const played = days.filter((d) => d.min > 0 || d.good > 0).length;
  const minutes = days.reduce((n, d) => n + d.min, 0);
  const good = days.reduce((n, d) => n + d.good, 0);
  return h(
    'section',
    { class: 'card' },
    h('h2', {}, 'Cette semaine'),
    h('p', {}, `${played} jour${played > 1 ? 's' : ''} de jeu, ${minutes} min, ${good} bonne${good > 1 ? 's' : ''} réponse${good > 1 ? 's' : ''}. Coffres ouverts en tout : ${state.chests}.`),
    chart,
    h('p', { class: 'muted' }, 'Le plus efficace : un peu chaque jour (10 à 15 minutes), plutôt qu’une longue séance.'),
  );
}

export function parentsScreen(ctx: Ctx): void {
  const section = (activity: ActivityId) => {
    const title = ACTIVITY_NAMES[activity];
    const select = h('select', { 'aria-label': `Niveau ${title}` });
    LEVEL_NAMES[activity].forEach((name, i) => {
      const opt = h('option', { value: String(i + 1) }, `${i + 1}. ${name}`);
      if (i + 1 === currentLevel(activity)) opt.selected = true;
      select.append(opt);
    });
    const info = () => `Niveau le plus haut atteint : ${unlockedLevel(activity)} sur ${MAX_LEVEL[activity]} · chapitre « ${CHAPTERS[activity][chapterOf(activity, currentLevel(activity))]} »`;
    const infoEl = h('p', { class: 'muted' }, info());
    const saved = h('span', { class: 'saved', role: 'status' }, '');
    select.onchange = () => {
      parentSetLevel(activity, Number(select.value));
      infoEl.textContent = info();
      saved.textContent = '✓ enregistré';
      tipsEl.replaceWith((tipsEl = tipsOf(activity)));
    };
    let tipsEl = tipsOf(activity);
    return h(
      'section',
      { class: 'card' },
      h('h2', {}, title),
      h('label', { class: 'field' }, 'Niveau joué ', select, ' ', saved),
      infoEl,
      h('h3', {}, 'Ce qui a été travaillé'),
      skillRows(activity),
      tipsEl,
    );
  };

  const tipsOf = (activity: ActivityId) => {
    const tips = TIPS[activity][chapterOf(activity, currentLevel(activity))] ?? [];
    return h('div', { class: 'tips' }, h('h3', {}, 'À faire ensemble, sans écran'), h('ul', {}, ...tips.map((t) => h('li', {}, t))));
  };

  // class of the child
  const gradeInfo = h('span', { class: 'saved', role: 'status' }, '');
  const gradeButtons = (['MS', 'GS', 'CP'] as Grade[]).map((g) => {
    const b = h('button', { class: `btn small${state.settings.grade === g ? ' green' : ''}` }, GRADE_NAMES[g]);
    b.onclick = () => {
      applyGrade(g);
      gradeInfo.textContent = '✓ niveaux adaptés';
      ctx.go('parents');
    };
    return b;
  });

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
      body: [h('p', {}, 'Les blocs, la maison, les héros coloriés, les niveaux et l’historique seront effacés. Les réglages sont gardés.')],
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
        childrenCard(ctx),
        h(
          'section',
          { class: 'card' },
          h('h2', {}, profiles.list.length > 1 ? `Classe : ${profileName(currentProfile())}` : 'Classe de l’enfant'),
          h('div', { class: 'grade-row' }, ...gradeButtons, gradeInfo),
          h('p', { class: 'muted' }, 'Fait démarrer chaque activité au bon endroit, sans jamais revenir en arrière. Les niveaux d’avant restent ouverts pour réviser.'),
        ),
        weekCard(),
        h(
          'section',
          { class: 'card' },
          h('h2', {}, 'En bref'),
          h('p', {}, `Blocs en réserve : ${totalBlocks()} · Héros réveillés : ${done} sur ${HEROES.length}`),
          h(
            'p',
            { class: 'muted' },
            'Chaque bonne réponse rapporte un bloc ; les blocs servent à colorier les héros et à construire la maison. Un niveau se débloque quand l’enfant réussit 80 % des réponses du premier coup. Pastilles : ',
            h('span', { class: 'chip box3' }, 'acquis'),
            ' ',
            h('span', { class: 'chip box2' }, 'en cours'),
            ' ',
            h('span', { class: 'chip box1' }, 'à revoir'),
          ),
        ),
        section('sounds'),
        section('write'),
        section('count'),
        h(
          'section',
          { class: 'card' },
          h('h2', {}, 'Notre méthode'),
          h(
            'ul',
            { class: 'method' },
            h('li', {}, h('b', {}, 'Lire : '), 'd’abord les sons de la langue à l’oral (syllabes, rimes, premier son), puis le lien lettre-son enseigné pas à pas, la fusion en syllabes, des mots déchiffrables, puis des phrases. La voix ne lit jamais à la place de l’enfant, sauf pour aider après une erreur (programmes 2025, guide du Conseil scientifique de l’Éducation nationale).'),
            h('li', {}, h('b', {}, 'Écrire : '), 'voir, entendre et tracer la lettre en même temps aide à la reconnaître et à la lire (travaux de Bara, Gentaz et Colé ; Longcamp). Capitales, chiffres, puis cursive par familles de gestes. Le tracé au doigt complète le crayon, il ne le remplace pas.'),
            h('li', {}, h('b', {}, 'Compter : '), 'un plateau en ligne où l’on dit les nombres en avançant (Siegler et Ramani), le coup d’œil sur les dés et le cadre de dix, la décomposition (« combien sont cachés ? », la situation de référence du guide CP), puis le calcul et les petits problèmes.'),
            h('li', {}, h('b', {}, 'Motivation : '), 'des félicitations pour l’effort et la persévérance, jamais de punition, des récompenses liées au jeu, et des révisions espacées des notions fragiles.'),
          ),
        ),
        voiceCard(ctx),
        h(
          'section',
          { class: 'card' },
          h('h2', {}, 'Temps de jeu'),
          h('label', { class: 'field' }, 'Pause au bout de ', limit, ' ', limitSaved),
          h('p', { class: 'muted' }, 'Quand le temps est écoulé, Pixel propose une pause. Le compteur repart à zéro après 30 minutes sans jouer.'),
          playInfo,
          restart,
        ),
        h(
          'section',
          { class: 'card' },
          h('h2', {}, 'Réinitialiser'),
          h('p', { class: 'muted' }, `Efface les blocs, la maison, les héros, les niveaux et l’historique${profiles.list.length > 1 ? ` de ${profileName(currentProfile())}` : ''}.`),
          reset,
        ),
        h('p', { class: 'muted center' }, 'Aucune donnée ne quitte cet appareil : pas de compte, pas de publicité, pas de micro.'),
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
