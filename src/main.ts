import './style.css';
import { say, sfx, stopSpeech } from './audio';
import { foxSVG } from './pixel';
import { currentLevel } from './levels';
import { blockImg, h, counter } from './ui';
import { soundsScreen } from './screens/sounds';
import { countScreen } from './screens/count';
import { buildScreen } from './screens/build';
import { parentGate, parentsScreen } from './screens/parents';
import { colorScreen, currentHero, heroesScreen } from './screens/heroes';
import { HEROES } from './content/heroes';
import { heroSVG } from './heroArt';
import { state } from './state';
import type { ScreenName } from './screens/types';

const app = document.getElementById('app')!;


function go(name: ScreenName): void {
  stopSpeech();
  app.replaceChildren();
  const ctx = { go, root: app };
  switch (name) {
    case 'home':
      return homeScreen();
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
  }
}

function homeScreen(): void {
  const fox = h('button', { class: 'fox-btn', 'aria-label': 'Pixel le renard', html: foxSVG(140) });
  const bubble = h('div', { class: 'bubble' }, 'Coucou ! Choisis un jeu.');
  fox.onclick = () => {
    sfx.unlock();
    fox.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-20px)' }, { transform: 'translateY(0)' }], { duration: 400 });
    void say('Coucou ! Je suis Pixel. Joue à lire ou à compter pour gagner des blocs, puis colorie tes héros !');
  };

  const tile = (label: string, speech: string, icon: Node, cls: string, target: ScreenName, level?: number) => {
    const text = h('span', { class: 'tile-text' }, h('span', { class: 'tile-label' }, label));
    if (level) text.append(h('span', { class: 'tile-level' }, `Niveau ${level}`));
    const b = h('button', { class: `tile ${cls}` }, icon, text);
    b.onclick = () => {
      sfx.unlock();
      sfx.tap();
      void say(speech);
      go(target);
    };
    return b;
  };

  const letterIcon = h('div', { class: 'tile-icon' }, blockImg('plaque'), h('span', { class: 'glyph' }, 'a'));
  const numberIcon = h('div', { class: 'tile-icon' }, blockImg('plaque'), h('span', { class: 'glyph' }, '3'));
  const buildIcon = h('div', { class: 'tile-icon stack' }, blockImg('wood'), blockImg('grass'));
  const next = currentHero();
  const heroIcon = h('div', {
    class: 'tile-icon hero-icon',
    // last hero woken up, or the next one as it is coloured so far
    html: (() => {
      const lastId = state.heroes.done[state.heroes.done.length - 1];
      const last = HEROES.find((x) => x.id === lastId);
      if (last) return heroSVG(last, 'all', 84, 'idle');
      const hero = next ?? HEROES[0];
      return heroSVG(hero, new Set(state.heroes.filled[hero.id] ?? []), 84);
    })(),
  });

  const parents = h('button', { class: 'parents' }, 'Parents');
  parents.onclick = () => parentGate(() => go('parents'));

  app.append(
    h(
      'main',
      { class: 'screen home' },
      h('header', { class: 'topbar' }, parents, h('h1', { class: 'logo' }, 'SchoolCraft'), counter()),
      h('div', { class: 'hero' }, fox, bubble),
      h(
        'div',
        { class: 'tiles' },
        tile('Lire', 'Lire !', letterIcon, 't-sounds', 'sounds', currentLevel('sounds')),
        tile('Compter', 'Compter !', numberIcon, 't-count', 'count', currentLevel('count')),
        tile('Mes héros', 'Mes héros !', heroIcon, 't-heroes', 'heroes'),
        tile('Ma maison', 'Ma maison !', buildIcon, 't-build', 'build'),
      ),
      h('div', { class: 'ground' }),
    ),
  );
}

go('home');

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
