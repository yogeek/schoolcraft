// Small DOM helpers shared by every screen.
import { blockTexture, BLOCK_NAMES } from './pixel';
import { setLevel, unlockedLevel } from './levels';
import { BLOCK_TYPES, save, state, totalBlocks, type ActivityId, type BlockType } from './state';

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
}

export function blockImg(type: BlockType | 'plaque', cls = 'block'): HTMLImageElement {
  return h('img', { class: cls, src: blockTexture(type), alt: type === 'plaque' ? '' : BLOCK_NAMES[type], draggable: 'false' });
}

export function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---------- block counter in the top bar ----------
let counterEl: HTMLElement | null = null;

export function counter(): HTMLElement {
  counterEl = h('div', { class: 'counter', 'aria-label': 'Mes blocs' }, blockImg('grass', 'block mini'), h('span', {}, String(totalBlocks())));
  return counterEl;
}

function refreshCounter(): void {
  const span = counterEl?.querySelector('span');
  if (span) span.textContent = String(totalBlocks());
  counterEl?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 300 });
}

/** Refresh the top-bar counter after blocks were spent elsewhere. */
export function bumpCounter(): void {
  refreshCounter();
}

/** Give a block to the child, with a flying animation from `from` to the counter. */
export function giveBlock(type: BlockType, from?: Element): void {
  state.inventory[type]++;
  save();
  if (!from || !counterEl) return refreshCounter();
  const a = from.getBoundingClientRect();
  const b = counterEl.getBoundingClientRect();
  const fly = blockImg(type, 'block flying');
  fly.style.left = `${a.left + a.width / 2 - 24}px`;
  fly.style.top = `${a.top + a.height / 2 - 24}px`;
  document.body.append(fly);
  const dx = b.left - a.left - a.width / 2 + 24;
  const dy = b.top - a.top - a.height / 2 + 12;
  fly
    .animate(
      [
        { transform: 'translate(0,0) scale(1) rotate(0)' },
        { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 80}px) scale(1.3) rotate(180deg)`, offset: 0.4 },
        { transform: `translate(${dx}px, ${dy}px) scale(.5) rotate(360deg)` },
      ],
      { duration: 800, easing: 'ease-in' },
    )
    .finished.then(() => {
      fly.remove();
      refreshCounter();
    });
}

/** A random "common" block; gold when on a streak. */
export function rewardType(streak: number): BlockType {
  if (streak > 0 && streak % 3 === 0) return 'gold';
  return rand(BLOCK_TYPES.filter((t) => t !== 'gold'));
}

export function topBar(onHome: () => void, title?: string | Node): HTMLElement {
  const home = h('button', { class: 'btn-icon', 'aria-label': 'Accueil' }, h('span', { html: HOUSE_SVG }));
  home.onclick = onHome;
  return h('header', { class: 'topbar' }, home, h('div', { class: 'title' }, title ?? ''), counter());
}

/** "Niveau N" button in the top bar; opens a picker with the levels already reached. */
export function levelButton(activity: ActivityId, level: number, max: number, names: string[], restart: () => void): HTMLElement {
  const b = h('button', { class: 'level-btn' }, `Niveau ${level}`, h('span', { class: 'chev' }, '▾'));
  b.onclick = () => {
    const unlocked = unlockedLevel(activity);
    const close = () => overlay.remove();
    const list = h('div', { class: 'level-list' });
    for (let n = 1; n <= max; n++) {
      const open = n <= unlocked;
      const item = h(
        'button',
        { class: `level-item${n === level ? ' current' : ''}${open ? '' : ' locked'}` },
        h('span', { class: 'level-no' }, open ? String(n) : '🔒'),
        h('span', {}, names[n - 1]),
      );
      if (open) {
        item.onclick = () => {
          close();
          setLevel(activity, n);
          restart();
        };
      } else item.disabled = true;
      list.append(item);
    }
    const shut = h('button', { class: 'btn' }, 'Fermer');
    shut.onclick = close;
    const overlay = h('div', { class: 'overlay' }, h('div', { class: 'panel' }, h('h2', {}, 'Choisis ton niveau'), list, shut));
    overlay.onclick = (e) => e.target === overlay && close();
    document.body.append(overlay);
  };
  return b;
}

export const HOUSE_SVG =
  '<svg viewBox="0 0 8 8" width="32" height="32" shape-rendering="crispEdges"><path fill="#7a4b2a" d="M1 4h6v4H1z"/><path fill="#c0392b" d="M0 4h8V3H7V2H6V1H5V0H3v1H2v1H1v1H0z"/><path fill="#3b2412" d="M3 5h2v3H3z"/></svg>';
export const SPEAKER_SVG =
  '<svg viewBox="0 0 10 10" width="40" height="40" shape-rendering="crispEdges"><path fill="#2b2b2b" d="M1 3h2V2h1V1h1v8H4V8H3V7H1z"/><path fill="#2b2b2b" d="M6 3h1v4H6zM8 2h1v6H8z"/></svg>';

// ---------- reliable taps for small fingers ----------
// Browsers drop the `click` when a finger moves a little, presses for long (image callout / context
// menu) or lands on the 3D shadow under a block. Young children do all of this. So we activate a
// button ourselves on `pointerup` when the finger is still on (or near) the element it pressed,
// and swallow the browser's own click if it comes too, so nothing fires twice.
const TAPPABLE = 'button:not(:disabled), .px.zone';
const SLOP = 28; // px of tolerance around the element

export function installTapFix(): void {
  let downEl: HTMLElement | null = null;
  let downId = -1;
  let synthEl: HTMLElement | null = null;
  let synthAt = 0;

  const clear = () => {
    downEl?.classList.remove('pressed');
    downEl = null;
    downId = -1;
  };

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (e.button > 0) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(TAPPABLE);
      if (!el) return;
      downEl = el;
      downId = e.pointerId;
      el.classList.add('pressed');
    },
    true,
  );

  document.addEventListener(
    'pointerup',
    (e) => {
      if (!downEl || e.pointerId !== downId) return;
      const el = downEl;
      clear();
      const r = el.getBoundingClientRect();
      const inside = e.clientX >= r.left - SLOP && e.clientX <= r.right + SLOP && e.clientY >= r.top - SLOP && e.clientY <= r.bottom + SLOP;
      if (!inside || !el.isConnected) return;
      synthEl = el;
      synthAt = performance.now();
      el.click();
    },
    true,
  );

  // the page started scrolling: this was not a tap
  document.addEventListener('pointercancel', clear, true);

  document.addEventListener(
    'click',
    (e) => {
      // the browser's own click right after ours → ignore it (keyboard clicks still go through)
      if (e.isTrusted && synthEl && performance.now() - synthAt < 800 && synthEl.contains(e.target as Node)) {
        e.stopPropagation();
        e.preventDefault();
        synthEl = null;
      }
    },
    true,
  );

  // no "save image" / context menu on long press
  document.addEventListener('contextmenu', (e) => {
    if ((e.target as Element | null)?.closest('#app, .overlay')) e.preventDefault();
  });
}
