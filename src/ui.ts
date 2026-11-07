// Small DOM helpers shared by every screen.
import { blockTexture, BLOCK_NAMES } from './pixel';
import { BLOCK_TYPES, save, state, totalBlocks, type BlockType } from './state';

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

export function topBar(onHome: () => void, title?: string): HTMLElement {
  const home = h('button', { class: 'btn-icon', 'aria-label': 'Accueil' }, h('span', { html: HOUSE_SVG }));
  home.onclick = onHome;
  return h('header', { class: 'topbar' }, home, h('div', { class: 'title' }, title ?? ''), counter());
}

export const HOUSE_SVG =
  '<svg viewBox="0 0 8 8" width="32" height="32" shape-rendering="crispEdges"><path fill="#7a4b2a" d="M1 4h6v4H1z"/><path fill="#c0392b" d="M0 4h8V3H7V2H6V1H5V0H3v1H2v1H1v1H0z"/><path fill="#3b2412" d="M3 5h2v3H3z"/></svg>';
export const SPEAKER_SVG =
  '<svg viewBox="0 0 10 10" width="40" height="40" shape-rendering="crispEdges"><path fill="#2b2b2b" d="M1 3h2V2h1V1h1v8H4V8H3V7H1z"/><path fill="#2b2b2b" d="M6 3h1v4H6zM8 2h1v6H8z"/></svg>';
