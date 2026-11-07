import './style.css';
import { sfx, stopSpeech } from './audio';
import { HEROES } from './content/heroes';
import { heroSVG } from './heroArt';
import { currentLevel } from './levels';
import { beginScreen } from './nav';
import { overLimit, startPlayClock, tickPlayClock } from './playtime';
import { buildScreen } from './screens/build';
import { countScreen } from './screens/count';
import { colorScreen, currentHero, heroesScreen } from './screens/heroes';
import { parentGate, parentsScreen, pauseScreen } from './screens/parents';
import { soundsScreen } from './screens/sounds';
import type { Ctx, ScreenName } from './screens/types';
import { state } from './state';
import { blockImg, bubble, counter, h, installTapFix, mascot } from './ui';

const app = document.getElementById('app')!;
let shown: ScreenName = 'home';

function go(name: ScreenName): void {
  tickPlayClock();
  // time is up: every screen leads to the pause, except the parents' area
  if (name !== 'parents' && overLimit()) name = 'pause';
  shown = name;
  const ctx: Ctx = { go, root: app, ...beginScreen(app) };
  switch (name) {
    case 'home':
      return homeScreen(ctx);
    case 'sounds':
      return soundsScreen(ctx);
    case 'count':
      return countScreen(ctx);
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
  const welcome = 'Coucou ! Je suis Pixel. Joue à lire ou à compter pour gagner des blocs. Avec les blocs, tu colories tes amis et tu construis ta maison !';

  const tile = (label: string, icon: Node, cls: string, target: ScreenName, level?: number) => {
    const text = h('span', { class: 'tile-text' }, h('span', { class: 'tile-label' }, label));
    if (level) text.append(h('span', { class: 'tile-level' }, `Niveau ${level}`));
    const b = h('button', { class: `tile ${cls}` }, icon, text);
    b.onclick = () => {
      sfx.unlock();
      sfx.tap();
      ctx.go(target); // the next screen speaks its own instructions
    };
    return b;
  };

  const letterIcon = h('div', { class: 'tile-icon' }, blockImg('plaque'), h('span', { class: 'glyph' }, 'a'));
  const numberIcon = h('div', { class: 'tile-icon' }, blockImg('plaque'), h('span', { class: 'glyph' }, '3'));
  const buildIcon = h('div', { class: 'tile-icon stack' }, blockImg('wood'), blockImg('grass'));
  // last hero woken up, or the next one as coloured so far
  const lastId = state.heroes.done[state.heroes.done.length - 1];
  const last = HEROES.find((x) => x.id === lastId);
  const next = currentHero() ?? HEROES[0];
  const heroIcon = h('div', {
    class: 'tile-icon hero-icon',
    html: last ? heroSVG(last, 'all', 84, 'idle') : heroSVG(next, new Set(state.heroes.filled[next.id] ?? []), 84),
  });

  const parents = h('button', { class: 'parents' }, 'Parents');
  parents.onclick = () => parentGate(() => ctx.go('parents'));

  ctx.root.append(
    h(
      'main',
      { class: 'screen home' },
      h('header', { class: 'topbar' }, parents, h('h1', { class: 'logo' }, 'SchoolCraft'), counter()),
      h('div', { class: 'hero' }, mascot(130, () => void ctx.say(welcome)), bubble('Coucou ! Choisis un jeu.')),
      h(
        'div',
        { class: 'tiles' },
        tile('Lire', letterIcon, 't-sounds', 'sounds', currentLevel('sounds')),
        tile('Compter', numberIcon, 't-count', 'count', currentLevel('count')),
        tile('Mes héros', heroIcon, 't-heroes', 'heroes'),
        tile('Ma maison', buildIcon, 't-build', 'build'),
      ),
      h('div', { class: 'ground' }),
    ),
  );
}

installTapFix();
go('home');

// the voice must not go on when the app is put in the background
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopSpeech();
});

// time limit: free-play screens have no natural end, so the pause comes to them
startPlayClock(() => {
  if (overLimit() && (shown === 'home' || shown === 'heroes' || shown === 'build')) go('pause');
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
