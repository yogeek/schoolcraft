// Small DOM helpers shared by every screen.
import { sfx } from './audio';
import { blockTexture, BLOCK_NAMES, foxSVG } from './pixel';
import { COMMON_BLOCKS, save, state, totalBlocks, type BlockType } from './state';

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

export function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ---------- block counter in the top bar ----------
let counterEl: HTMLElement | null = null;

export function counter(): HTMLElement {
  counterEl = h('div', { class: 'counter', role: 'status', 'aria-label': `${totalBlocks()} blocs` }, blockImg('grass', 'block mini'), h('span', {}, String(totalBlocks())));
  return counterEl;
}

/** Refresh the top-bar counter after blocks were won or spent. */
export function bumpCounter(): void {
  const span = counterEl?.querySelector('span');
  if (span) span.textContent = String(totalBlocks());
  counterEl?.setAttribute('aria-label', `${totalBlocks()} blocs`);
  if (!reducedMotion()) counterEl?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 300 });
}

/** Give a block to the child, with a flying animation from `from` to the counter. */
export function giveBlock(type: BlockType, from?: Element): void {
  state.inventory[type]++;
  save();
  if (!from || !counterEl || reducedMotion()) return bumpCounter();
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
    .finished.catch(() => {})
    .then(() => {
      fly.remove();
      bumpCounter();
    });
}

/** Blocks for a finished game: one per star (at least one for finishing), the third one gold;
 *  a single block when the level already had 3 stars (replaying it is fine, farming it is not). */
export function gameBlocks(stars: number, before: number): BlockType[] {
  if (before >= 3) return [rand(COMMON_BLOCKS)];
  if (stars >= 3) return [rand(COMMON_BLOCKS), rand(COMMON_BLOCKS), 'gold'];
  return Array.from({ length: Math.max(1, stars) }, () => rand(COMMON_BLOCKS));
}

export function topBar(onHome: () => void, title?: string | Node): HTMLElement {
  const home = h('button', { class: 'btn-icon', 'aria-label': 'Accueil' }, h('span', { html: HOUSE_SVG }));
  home.onclick = () => {
    sfx.tap();
    onHome();
  };
  return h('header', { class: 'topbar' }, home, h('div', { class: 'title' }, title ?? ''), counter());
}

/** Pixel the fox. Tapping it makes it jump and runs `onTap` (usually: repeat the instruction). */
export function mascot(size: number, onTap?: () => void): HTMLElement {
  const fox = h('button', { class: 'fox-btn', 'aria-label': 'Pixel le renard : réécouter', html: foxSVG(size) });
  fox.onclick = () => {
    sfx.unlock();
    if (!reducedMotion()) fox.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-18px)' }, { transform: 'translateY(0)' }], { duration: 380 });
    onTap?.();
  };
  return fox;
}

/** French typography: no-break space before ! ? : ; and inside « » (a lone "!" never starts a line). */
export function fr(text: string): string {
  return text.replace(/ ([!?:;»])/g, '\u00a0$1').replace(/« /g, '«\u00a0');
}

/** Speech bubble; screen readers announce its changes. */
export function bubble(text = ''): HTMLElement {
  return h('div', { class: 'bubble', 'aria-live': 'polite' }, fr(text));
}

export function setBubble(el: HTMLElement, text: string): void {
  el.textContent = fr(text);
}

/** "Niveau N" button in the top bar; opens the map of the activity. */
export function levelButton(level: number, openMap: () => void): HTMLElement {
  const b = h('button', { class: 'level-btn', 'aria-label': `Niveau ${level} : voir la carte` }, `Niveau ${level}`, h('span', { class: 'chev', 'aria-hidden': 'true' }, '▾'));
  b.onclick = () => {
    sfx.tap();
    openMap();
  };
  return b;
}

// ---------- modal dialog ----------
export interface ModalAction {
  label: string;
  cls?: string;
  /** return false to keep the dialog open */
  onClick?: () => boolean | void;
}

/** In-app dialog (no window.prompt/confirm: they are blocked in some web views and break the game look). */
export function modal(opts: { title: string; body?: (Node | string)[]; actions: ModalAction[]; dismissable?: boolean; cls?: string }): { close(): void; panel: HTMLElement } {
  const buttons = opts.actions.map((a) => {
    const b = h('button', { class: `btn ${a.cls ?? ''}`.trim() }, a.label);
    b.onclick = () => {
      if (a.onClick?.() === false) return;
      close();
    };
    return b;
  });
  const panel = h('div', { class: `panel ${opts.cls ?? ''}`.trim(), role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title }, h('h2', {}, fr(opts.title)), ...(opts.body ?? []), h('div', { class: 'panel-actions' }, ...buttons));
  const overlay = h('div', { class: 'overlay' }, panel);
  const close = () => overlay.remove();
  if (opts.dismissable !== false) overlay.onclick = (e) => e.target === overlay && close();
  document.body.append(overlay);
  return { close, panel };
}

export const HOUSE_SVG =
  '<svg viewBox="0 0 8 8" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true"><path fill="#7a4b2a" d="M1 4h6v4H1z"/><path fill="#c0392b" d="M0 4h8V3H7V2H6V1H5V0H3v1H2v1H1v1H0z"/><path fill="#3b2412" d="M3 5h2v3H3z"/></svg>';
export const SPEAKER_SVG =
  '<svg viewBox="0 0 10 10" width="40" height="40" shape-rendering="crispEdges" aria-hidden="true"><path fill="#2b2b2b" d="M1 3h2V2h1V1h1v8H4V8H3V7H1z"/><path fill="#2b2b2b" d="M6 3h1v4H6zM8 2h1v6H8z"/></svg>';

/** Big "listen again" button. */
export function speakerButton(onTap: () => void): HTMLElement {
  const b = h('button', { class: 'btn-icon speaker', 'aria-label': 'Réécouter', html: SPEAKER_SVG });
  b.onclick = () => {
    sfx.unlock();
    onTap();
  };
  return b;
}

// ---------- reliable taps for small fingers ----------
// Browsers drop the `click` when a finger moves a little, presses for long (image callout / context
// menu) or lands on the 3D shadow under a block. Young children do all of this. So we activate a
// button ourselves on `pointerup` when the finger is still on (or near) the element it pressed.
// The browser's own click for that same touch must then never arrive: the screen may already have
// changed, and that "ghost" click would land on whatever is now under the finger (a new answer!).
const TAPPABLE = 'button:not(:disabled), .px.zone';
const SLOP = 28; // px of tolerance around the element

export function installTapFix(): void {
  let downEl: HTMLElement | null = null;
  let downId = -1;
  let handled = false; // the current gesture was turned into a click by us
  let swallowUntil = 0;

  const clear = () => {
    downEl?.classList.remove('pressed');
    downEl = null;
    downId = -1;
  };

  document.addEventListener(
    'pointerdown',
    (e) => {
      handled = false; // a new gesture: its own native click is legitimate unless we handle it
      swallowUntil = 0;
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
      handled = true;
      swallowUntil = performance.now() + 1000;
      el.click();
    },
    true,
  );

  // touch: cancel the browser's click for a gesture we already handled (no ghost click)
  document.addEventListener(
    'touchend',
    (e) => {
      if (handled && e.cancelable) e.preventDefault();
    },
    { capture: true, passive: false },
  );

  // the page started scrolling: this was not a tap
  document.addEventListener('pointercancel', clear, true);

  // mouse (and any browser that still sends it): drop the native click of a handled gesture,
  // whatever element it lands on. Keyboard clicks (Enter/Space) are not affected.
  document.addEventListener(
    'click',
    (e) => {
      // detail = number of clicks of a finger/mouse; keyboard activation has detail 0 and always goes through
      if (e.isTrusted && e.detail > 0 && handled && performance.now() < swallowUntil) {
        e.stopPropagation();
        e.preventDefault();
        handled = false;
      }
    },
    true,
  );

  // no "save image" / context menu on long press
  document.addEventListener('contextmenu', (e) => {
    if ((e.target as Element | null)?.closest('#app, .overlay')) e.preventDefault();
  });
}
