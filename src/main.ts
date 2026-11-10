import './style.css';
import { prefetchVoice, sfx, stopSpeech } from './audio';
import { HEROES } from './content/heroes';
import { heroSVG } from './heroArt';
import { currentLevel, parentSetLevel } from './levels';
import { beginScreen } from './nav';
import { overLimit, startPlayClock, tickPlayClock } from './playtime';
import { activityScreen } from './screens/activity';
import { buildScreen } from './screens/build';
import { chestReady, missionStrip, nextInMission, openChest, restScreen } from './screens/chest';
import { colorScreen, currentHero, heroesScreen } from './screens/heroes';
import { mapScreen } from './screens/map';
import { askWhoOnce, whoButton } from './screens/profiles';
import { parentGate, parentsScreen, pauseScreen } from './screens/parents';
import type { Ctx, ScreenName } from './screens/types';
import { coachParents, parentsSeen, takeCoach, welcomeDialog } from './screens/welcome';
import { mission, state, type ActivityId } from './state';
import { blockImg, bubble, counter, h, installTapFix, mascot, reducedMotion, setBubble } from './ui';

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
    case 'rest':
      return restScreen(ctx);
  }
}

/** when home last spoke (see the end of homeScreen) */
let homeSpoke = -1e9;
/** Pixel introduced itself in this visit (a child who has not played yet hears it on each launch) */
let introduced = false;

/** this child has not finished a single game yet */
function brandNew(): boolean {
  return Object.keys(state.stats).length === 0 && Object.values(state.stars).every((l) => l.length === 0);
}

function homeScreen(ctx: Ctx): void {
  const welcome =
    'Coucou ! Je suis Pixel. Chaque jour, on part à l’aventure : on lit, on écrit et on compte ! Avec tes étoiles, tu réveilles tes amis. Avec les blocs, tu construis ta maison.';

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

  const fox = mascot(130, () => void ctx.say(welcome));
  const bub = bubble(ready ? 'Un coffre t’attend !' : 'Coucou ! On joue ?');
  const parents = h('button', { class: `parents${parentsSeen() ? '' : ' unseen'}` }, 'Parents');
  parents.onclick = () => parentGate(() => ctx.go('parents'));
  const who = whoButton();

  ctx.root.append(
    h(
      'main',
      { class: 'screen home' },
      h('header', { class: 'topbar' }, h('div', { class: 'top-left' }, parents, who ?? ''), h('h1', { class: 'logo' }, 'SchoolCraft'), counter()),
      h('div', { class: 'hero' }, fox, bub),
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

  // back home after playing: Pixel says what comes next (speech needs a first touch on some devices).
  // A child who has not played yet first hears Pixel introduce itself. Home drawn again right away
  // (class chosen, child picked) does not say it twice.
  const speak = () => {
    if (!navigator.userActivation?.hasBeenActive || performance.now() - homeSpoke < 3000) return;
    homeSpoke = performance.now();
    const started = mission().done.length > 0;
    const next = ready ? "Bravo, tu as fini l'aventure du jour ! Ouvre ton coffre !" : todo ? (started ? "Touche l'aventure du jour pour continuer !" : "Touche l'aventure du jour pour commencer !") : 'Tu peux colorier tes amis, ou construire ta maison !';
    if (!introduced && brandNew()) {
      introduced = true;
      setBubble(bub, 'Coucou ! Je suis Pixel !');
      if (!reducedMotion()) fox.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-18px)' }, { transform: 'translateY(0)' }], { duration: 380, iterations: 2 });
      void ctx.say(welcome).then(() => (ctx.alive() ? ctx.say(next) : undefined));
    } else void ctx.say(next);
  };
  // Pixel keeps quiet while the parents fill in the welcome dialog, and while the coach mark
  // shows them their area: it speaks to the child once the device is handed over
  // several children: who is playing comes first, so the class is set on the right child's save
  if (state.settings.grade === null) {
    if (!askWhoOnce(() => ctx.alive() && welcomeDialog(ctx))) welcomeDialog(ctx);
  } else if (takeCoach()) coachParents(speak);
  else {
    askWhoOnce();
    speak();
  }
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
    // Pixel's voice, for offline play: once the app has settled
    setTimeout(prefetchVoice, 8000);
  });
}
