import './style.css';
import { say, sfx, stopSpeech } from './audio';
import { foxSVG } from './pixel';
import { currentLevel } from './levels';
import { resetAll } from './state';
import { blockImg, h, counter } from './ui';
import { soundsScreen } from './screens/sounds';
import { countScreen } from './screens/count';
import { buildScreen } from './screens/build';
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
  }
}

function homeScreen(): void {
  const fox = h('button', { class: 'fox-btn', 'aria-label': 'Pixel le renard', html: foxSVG(140) });
  const bubble = h('div', { class: 'bubble' }, 'Coucou ! Choisis un jeu.');
  fox.onclick = () => {
    sfx.unlock();
    fox.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-20px)' }, { transform: 'translateY(0)' }], { duration: 400 });
    void say("Coucou ! Je suis Pixel. Choisis un jeu : les sons, compter, ou construire !");
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

  const parents = h('button', { class: 'parents' }, 'Parents');
  parents.onclick = () => {
    const a = 6 + Math.floor(Math.random() * 4);
    const b = 6 + Math.floor(Math.random() * 4);
    const ans = window.prompt(`Espace parents — combien font ${a} × ${b} ?\n(Bonne réponse = effacer toute la progression)`);
    if (ans !== null && Number(ans) === a * b && window.confirm('Effacer les blocs, la maison et la progression ?')) {
      resetAll();
      go('home');
    }
  };

  app.append(
    h(
      'main',
      { class: 'screen home' },
      h('header', { class: 'topbar' }, parents, h('h1', { class: 'logo' }, 'SchoolCraft'), counter()),
      h('div', { class: 'hero' }, fox, bubble),
      h(
        'div',
        { class: 'tiles' },
        tile('Les sons', 'Les sons !', letterIcon, 't-sounds', 'sounds', currentLevel('sounds')),
        tile('Compter', 'Compter !', numberIcon, 't-count', 'count', currentLevel('count')),
        tile('Construire', 'Construire !', buildIcon, 't-build', 'build'),
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
