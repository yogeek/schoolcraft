import './style.css';
import { sfx, stopSpeech } from './audio';
import { HEROES } from './content/heroes';
import { heroSVG } from './heroArt';
import { applyGrade, currentLevel, GRADE_NAMES, parentSetLevel } from './levels';
import { beginScreen } from './nav';
import { overLimit, startPlayClock, tickPlayClock } from './playtime';
import { activityScreen } from './screens/activity';
import { buildScreen } from './screens/build';
import { chestReady, missionStrip, nextInMission, openChest } from './screens/chest';
import { colorScreen, currentHero, heroesScreen } from './screens/heroes';
import { mapScreen } from './screens/map';
import { askWhoOnce, whoButton } from './screens/profiles';
import { parentGate, parentsScreen, pauseScreen } from './screens/parents';
import type { Ctx, ScreenName } from './screens/types';
import { save, state, type ActivityId, type Grade } from './state';
import { blockImg, bubble, counter, h, installTapFix, mascot, modal } from './ui';

const app = document.getElementById('app')!;
let shown: ScreenName = 'home';

function go(name: ScreenName, activity?: ActivityId): void {
  tickPlayClock();
  // time is up: every screen leads to the pause, except the parents' area
  if (name !== 'parents' && overLimit()) name = 'pause';
  shown = name;
  const ctx: Ctx = { go, root: app, ...beginScreen(app) };
  switch (name) {
    case 'home':
      return homeScreen(ctx);
    case 'sounds':
    case 'write':
    case 'count':
      return activityScreen(ctx, name);
    case 'map':
      return mapScreen(ctx, activity ?? 'sounds');
    case 'build':
      return buildScreen(ctx);
    case 'parents':
      return parentsScreen(ctx);
    case 'heroes':
      return heroesScreen(ctx);
    case 'color':
      return colorScreen(ctx);
    case 'pause':
      return pauseScreen(ctx);
  }
}

function homeScreen(ctx: Ctx): void {
  const welcome =
    'Coucou ! Je suis Pixel. Chaque jour, on part à l’aventure : on lit, on écrit et on compte ! Avec les blocs gagnés, tu colories tes amis et tu construis ta maison.';

  const tile = (label: string, icon: Node, cls: string, onTap: () => void, level?: number) => {
    const text = h('span', { class: 'tile-text' }, h('span', { class: 'tile-label' }, label));
    if (level) text.append(h('span', { class: 'tile-level' }, `Niveau ${level}`));
    const b = h('button', { class: `tile ${cls}` }, icon, text);
    b.onclick = () => {
      sfx.unlock();
      sfx.tap();
      onTap(); // the next screen speaks its own instructions
    };
    return b;
  };

  const glyphIcon = (g: string) => h('div', { class: 'tile-icon' }, blockImg('plaque'), h('span', { class: 'glyph' }, g));
  const buildIcon = h('div', { class: 'tile-icon stack' }, blockImg('wood'), blockImg('grass'));
  // last hero woken up, or the next one as coloured so far
  const lastId = state.heroes.done[state.heroes.done.length - 1];
  const last = HEROES.find((x) => x.id === lastId);
  const next = currentHero() ?? HEROES[0];
  const heroIcon = h('div', {
    class: 'tile-icon hero-icon',
    html: last ? heroSVG(last, 'all', 84, 'idle') : heroSVG(next, new Set(state.heroes.filled[next.id] ?? []), 84),
  });

  // today's adventure: one game of each activity, then a chest
  const todo = nextInMission();
  const ready = chestReady();
  const adventureSpeech = "Tu as fini l'aventure du jour ! Reviens demain pour un nouveau coffre. Tu peux encore jouer si tu veux !";
  const adventure = h(
    'button',
    { class: `adventure${ready ? ' ready' : ''}${todo === null && !ready ? ' finished' : ''}`, 'aria-label': "L'aventure du jour" },
    h('span', { class: 'adv-title' }, "L'aventure du jour"),
    missionStrip(),
  );
  adventure.onclick = () => {
    sfx.unlock();
    sfx.tap();
    if (ready) return openChest(ctx, () => ctx.go('home'));
    if (todo) return ctx.go(todo); // straight into the game: its level intro speaks
    void ctx.say(adventureSpeech);
  };

  const parents = h('button', { class: 'parents' }, 'Parents');
  parents.onclick = () => parentGate(() => ctx.go('parents'));
  const who = whoButton();

  ctx.root.append(
    h(
      'main',
      { class: 'screen home' },
      h('header', { class: 'topbar' }, h('div', { class: 'top-left' }, parents, who ?? ''), h('h1', { class: 'logo' }, 'SchoolCraft'), counter()),
      h('div', { class: 'hero' }, mascot(130, () => void ctx.say(welcome)), bubble(ready ? 'Un coffre t’attend !' : 'Coucou ! On joue ?')),
      adventure,
      h(
        'nav',
        { class: 'tiles', 'aria-label': 'Jeux' },
        tile('Lire', glyphIcon('a'), 't-sounds', () => ctx.go('map', 'sounds'), currentLevel('sounds')),
        tile('Écrire', glyphIcon('✎'), 't-write', () => ctx.go('map', 'write'), currentLevel('write')),
        tile('Compter', glyphIcon('3'), 't-count', () => ctx.go('map', 'count'), currentLevel('count')),
        tile('Mes héros', heroIcon, 't-heroes', () => ctx.go('heroes')),
        tile('Ma maison', buildIcon, 't-build', () => ctx.go('build')),
      ),
      h('div', { class: 'ground' }),
    ),
  );

  if (state.settings.grade === null) askGrade(ctx);
  else askWhoOnce();
  // back home after playing: Pixel says what comes next (speech needs a first touch on some devices)
  if (navigator.userActivation?.hasBeenActive) {
    void ctx.say(ready ? "Bravo, tu as fini l'aventure du jour ! Ouvre ton coffre !" : todo ? "On continue l'aventure du jour ?" : 'Tu peux colorier tes amis, ou construire ta maison !');
  }
}

/** First launch: the parents tell the class, so the child starts at the right place. */
function askGrade(ctx: Ctx): void {
  const pick = (g: Grade | null) => () => {
    if (g) applyGrade(g);
    else state.settings.grade = 'MS'; // "plus tard": start at the beginning, do not ask again
    save();
    dlg.close();
    ctx.go('home');
  };
  const options = (['MS', 'GS', 'CP'] as Grade[]).map((g) => {
    const b = h('button', { class: 'btn grade-btn' }, GRADE_NAMES[g]);
    b.onclick = pick(g);
    return b;
  });
  const later = h('button', { class: 'btn small' }, 'Commencer au début');
  later.onclick = pick(null);
  const dlg = modal({
    title: 'Bienvenue !',
    body: [
      h('p', { class: 'center' }, 'Pour les parents : dans quelle classe est votre enfant ? Les jeux commenceront au bon niveau (modifiable dans l’espace Parents).'),
      h('div', { class: 'grade-list' }, ...options),
      later,
    ],
    actions: [],
    dismissable: false,
    cls: 'welcome-panel',
  });
}

installTapFix();
// dev only: #play=sounds:7 opens a level directly (for testing; not in production builds)
const jump = import.meta.env.DEV ? /^#play=(sounds|write|count):(\d+)$/.exec(location.hash) : null;
if (jump) {
  const a = jump[1] as ActivityId;
  state.settings.grade ??= 'MS';
  parentSetLevel(a, Number(jump[2]));
  go(a);
} else go('home');

// the voice must not go on when the app is put in the background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopSpeech();
});

// time limit: free-play screens have no natural end, so the pause comes to them
startPlayClock(() => {
  if (overLimit() && (shown === 'home' || shown === 'heroes' || shown === 'build' || shown === 'map')) go('pause');
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
