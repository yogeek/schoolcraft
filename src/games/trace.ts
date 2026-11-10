// Activité « Écrire » : tracer une lettre ou un chiffre au doigt.
//
// Geste + son + vue (Bara, Gentaz et Colé) : Pixel montre le tracé en disant le nom de la lettre
// et un mot repère, puis l'enfant suit le chemin dans le bon sens, trait après trait. Le doigt
// fait avancer l'encre seulement le long du chemin, dans l'ordre ; s'il lève le doigt, il reprend
// là où il s'était arrêté. Une lettre réussie se construit en blocs.
import { NUMBER_WORDS } from '../content/counting';
import { glyph, LETTER_SPEECH, type Glyph, type WritingLevel } from '../content/writing';
import type { Game, Round } from '../game';
import { blockTexture } from '../pixel';
import { COMMON_BLOCKS, pickWeighted } from '../state';
import { blockImg, h, rand, reducedMotion } from '../ui';

const NS = 'http://www.w3.org/2000/svg';
const STEP = 2; // distance between two checkpoints of a stroke, in box units (the box is 100 high)
const DEMO_SPEED = 75; // box units per second

interface Pt {
  x: number;
  y: number;
}

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

/** What the voice says to introduce a glyph, and after it is traced. */
function speech(gl: Glyph): { intro: string; done: string } {
  if (gl.script === 'dig') {
    const w = NUMBER_WORDS[Number(gl.char)];
    return { intro: `Voici le chiffre : ${w}.`, done: `${w} !` };
  }
  const s = LETTER_SPEECH[gl.char.toLowerCase()];
  return { intro: `Voici la lettre : ${s.name}, comme ${s.ex}.`, done: `${s.name}, comme ${s.ex} !` };
}

export function writingGame(level: WritingLevel): Game {
  const memory = !!level.memory;
  // Tolerances follow the finger, not the drawing: they are set in screen pixels, then turned into
  // box units for the board's current size (and kept within sensible bounds of the letter).
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const tol = (scale: number) => ({
    adv: clamp((memory ? 30 : 26) / scale, 8, 14), // the finger is "on" a checkpoint within this distance
    off: clamp((memory ? 56 : 48) / scale, 16, 26), // farther than this from the path: off the path
    start: clamp(40 / scale, 12, 20), // where a stroke may be started or taken up again
  });
  let prev: string | undefined;
  let saidRepeat = false;
  /** the question being shown */
  let cur: { demo(): Promise<void>; intro: string; started(): boolean; go(): void } | null = null;

  return {
    praise: ['Joli tracé !', 'Bravo, tu as bien suivi le chemin !', 'Superbe lettre !', 'Bien écrit !', 'Bravo !'],

    setup(r: Round): string {
      const char = pickWeighted(level.chars, (c) => `write:${level.script}:${c}`, prev);
      prev = char;
      const gl = glyph(level.script, char);
      const words = speech(gl);
      // the bubble is never empty, from the level intro on (ask() says the same)
      r.bubble(memory ? 'Écris de mémoire !' : 'Regarde bien !');
      let demoing = false;
      // the board waits for the end of the instruction: a finger during the level intro would trace,
      // then the demo would wipe it
      let waiting = true;
      let offs = 0;
      let hinted = -Infinity; // last time the voice said where to start (it does not repeat itself)
      let stuck = 0; // since when the finger moves without the ink going forward

      // ---------- the board
      const view = svg('svg', { viewBox: `${(gl.w - 100) / 2} 0 100 100`, class: 'trace-svg', 'aria-hidden': 'true' });
      const x0 = (gl.w - 100) / 2;
      const lines = gl.script === 'cur' ? [8, 42, 72, 96] : [12, 88];
      for (const y of lines) {
        view.append(svg('line', { x1: x0, x2: x0 + 100, y1: y, y2: y, class: y === 72 ? 'trace-line base' : 'trace-line' }));
      }
      const roads = gl.strokes.map((d) => svg('path', { d, class: `trace-road${memory ? ' faint' : ''}` }));
      const dashes = gl.strokes.map((d) => svg('path', { d, class: 'trace-dash' }));
      const inks = gl.strokes.map((d) => svg('path', { d, class: 'trace-ink' }));
      const blocks = svg('g', { class: 'trace-blocks' });
      const marker = svg('g', { class: 'trace-start' });
      const startDot = svg('circle', { r: 6.5 });
      const arrow = svg('path', { d: 'M-3 -3.4 L3.6 0 L-3 3.4 Z', class: 'trace-arrow' });
      const number = svg('text', { class: 'trace-num', 'text-anchor': 'middle', dy: '-9' });
      marker.append(startDot, arrow, number);
      const pen = svg('circle', { r: 5, class: 'trace-pen', visibility: 'hidden' });
      view.append(...roads, ...(memory ? [] : dashes), ...inks, blocks, marker, pen);

      const board = h('div', { class: 'trace-board waiting', role: 'img', 'aria-label': `Tracer : ${gl.char}` });
      board.append(view);
      r.stage.classList.add('trace-stage');
      r.stage.append(board);

      // beside the board: the same letter as printed in books, or the quantity of a digit
      if (gl.script === 'cur') {
        r.stage.append(h('div', { class: 'trace-side' }, h('div', { class: 'choice static', 'aria-hidden': 'true' }, blockImg('plaque'), h('span', { class: 'glyph' }, gl.char))));
      } else if (gl.script === 'dig' && gl.char !== '0') {
        const frame = h('div', { class: 'mini-frame', 'aria-hidden': 'true' });
        for (let i = 0; i < Number(gl.char); i++) frame.append(blockImg('gold'));
        r.stage.append(h('div', { class: 'trace-side' }, frame));
      }

      // ---------- checkpoints along each stroke (measured once the board is in the page)
      const pts: Pt[][] = roads.map((p) => {
        const len = p.getTotalLength();
        const n = Math.max(1, Math.ceil(len / STEP));
        return Array.from({ length: n + 1 }, (_, i) => {
          const q = p.getPointAtLength((len * i) / n);
          return { x: q.x, y: q.y };
        });
      });
      const lens = roads.map((p) => p.getTotalLength());
      inks.forEach((ink, i) => {
        ink.style.strokeDasharray = `${lens[i] + 1}`;
        ink.style.strokeDashoffset = `${lens[i] + 1}`;
      });

      let stroke = 0;
      let at = 0; // checkpoint reached in the current stroke
      let pointer = -1;

      const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
      const showInk = (s: number, upTo: number) => {
        const done = (lens[s] * upTo) / (pts[s].length - 1);
        inks[s].style.strokeDashoffset = `${Math.max(0, lens[s] + 1 - done)}`;
      };
      const placeMarker = () => {
        if (stroke >= pts.length) {
          marker.setAttribute('visibility', 'hidden');
          return;
        }
        const p = pts[stroke][at];
        const q = pts[stroke][Math.min(at + 3, pts[stroke].length - 1)];
        const angle = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
        marker.setAttribute('visibility', 'visible');
        marker.setAttribute('transform', `translate(${p.x} ${p.y})`);
        arrow.setAttribute('transform', `rotate(${angle}) translate(11 0)`);
        number.textContent = gl.strokes.length > 1 && at === 0 ? String(stroke + 1) : '';
        roads.forEach((road, i) => road.classList.toggle('now', i === stroke));
      };
      const reset = () => {
        stroke = 0;
        at = 0;
        inks.forEach((_, i) => showInk(i, 0));
        placeMarker();
      };
      reset();

      const toBox = (e: PointerEvent): Pt => {
        const m = view.getScreenCTM();
        if (!m) return { x: -999, y: -999 };
        const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
        return { x: p.x, y: p.y };
      };
      /** screen pixels per box unit, right now */
      const scale = () => view.getScreenCTM()?.a || 3;
      const movePen = (p: Pt | null) => {
        if (!p) return pen.setAttribute('visibility', 'hidden');
        pen.setAttribute('visibility', 'visible');
        pen.setAttribute('cx', String(p.x));
        pen.setAttribute('cy', String(p.y));
      };
      const nudge = () => {
        if (reducedMotion()) return;
        marker.classList.remove('nudge');
        void board.offsetWidth;
        marker.classList.add('nudge');
      };

      // ---------- Pixel shows how to write it
      async function demo(): Promise<void> {
        demoing = true;
        board.classList.add('demo');
        inks.forEach((_, i) => showInk(i, 0));
        for (let s = 0; s < pts.length; s++) {
          const total = pts[s].length - 1;
          const ms = (lens[s] / DEMO_SPEED) * 1000;
          const t0 = performance.now();
          await new Promise<void>((resolve) => {
            const frame = (now: number) => {
              if (!r.stage.isConnected) return resolve();
              const k = Math.min(1, (now - t0) / ms);
              const i = Math.round(k * total);
              showInk(s, i);
              movePen(pts[s][i]);
              if (k < 1) requestAnimationFrame(frame);
              else resolve();
            };
            requestAnimationFrame(frame);
          });
          if (!(await r.wait(250))) break;
        }
        movePen(null);
        board.classList.remove('demo');
        demoing = false;
        if (await r.wait(350)) reset();
      }

      async function finish(): Promise<void> {
        movePen(null);
        marker.setAttribute('visibility', 'hidden');
        await r.win(board, async () => {
          buildInBlocks();
          r.bubble(gl.char);
          await r.say(words.done);
          if (!saidRepeat && gl.script !== 'dig') {
            saidRepeat = true;
            await r.say('Dis-le avec moi !');
          }
          await r.wait(400);
        });
      }

      /** the traced glyph turns into a little wall of blocks */
      function buildInBlocks(): void {
        const cell = 6;
        const seen = new Set<string>();
        const order: Pt[] = [];
        for (const s of pts)
          for (const p of s) {
            const k = `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)}`;
            if (seen.has(k)) continue;
            seen.add(k);
            order.push({ x: Math.floor(p.x / cell) * cell, y: Math.floor(p.y / cell) * cell });
          }
        const tex = blockTexture(rand(COMMON_BLOCKS));
        order.forEach((p, i) => {
          const img = svg('image', { href: tex, x: p.x, y: p.y, width: cell, height: cell, class: 'trace-block' });
          img.style.animationDelay = `${i * 12}ms`;
          blocks.append(img);
        });
        board.classList.add('built');
      }

      // ---------- the child traces
      view.addEventListener('pointerdown', (e) => {
        if (!r.open() || demoing || waiting || stroke >= pts.length) return;
        const p = toBox(e);
        if (dist(p, pts[stroke][at]) > tol(scale()).start) {
          nudge();
          r.bubble(at === 0 && stroke === 0 ? 'Commence au point vert !' : 'Continue au point vert !');
          // a child who cannot read does not know the green dot matters: say it (not at every touch)
          if (performance.now() - hinted > 4000) {
            hinted = performance.now();
            void r.say(at === 0 && stroke === 0 ? 'Pose ton doigt sur le point vert.' : 'Continue au point vert, et suis le chemin.');
          }
          return;
        }
        stuck = 0;
        pointer = e.pointerId;
        try {
          view.setPointerCapture(e.pointerId); // keep the finger even when it slips off the board
        } catch {
          /* not an active pointer (synthetic event) */
        }
        movePen(p);
        e.preventDefault();
      });

      view.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pointer || stroke >= pts.length) return;
        if (!r.open()) {
          pointer = -1;
          return;
        }
        const p = toBox(e);
        movePen(p);
        const { adv: ADV, off: OFF } = tol(scale());
        const line = pts[stroke];
        // move forward along the path to the farthest checkpoint the finger covers (no skipping ahead)
        let best = at;
        for (let i = at + 1; i < Math.min(line.length, at + 9); i++) if (dist(p, line[i]) <= ADV) best = i;
        // the finger moves but the ink waits (a little beside the path): show where the ink is
        if (best > at) stuck = 0;
        else if (!stuck) stuck = performance.now();
        else if (performance.now() - stuck > 700) {
          stuck = performance.now();
          nudge();
          r.bubble('Suis le chemin !');
        }
        at = best;
        showInk(stroke, at);
        // still near the path around where the ink is?
        let near = Infinity;
        for (let i = Math.max(0, at - 4); i < Math.min(line.length, at + 10); i++) near = Math.min(near, dist(p, line[i]));
        if (at >= line.length - 2) {
          // this stroke is done
          showInk(stroke, line.length - 1);
          pointer = -1;
          stroke++;
          at = 0;
          movePen(null);
          if (stroke >= pts.length) void finish();
          else {
            placeMarker();
            r.bubble('Encore un trait !');
          }
          return;
        }
        placeMarker();
        if (near > OFF) {
          pointer = -1;
          movePen(null);
          offs++;
          if (offs >= 2) r.miss(null); // the first slip is free: small fingers are not pencils
          nudge();
          // every third slip, Pixel shows again, and says so (in memory mode, the path comes back)
          if (offs % 3 === 0) {
            roads.forEach((road) => road.classList.remove('faint'));
            const s = stroke;
            const a = at;
            void (async () => {
              r.hold(true);
              r.bubble('Regarde bien !');
              await r.say('Regarde bien comment on l’écrit.');
              await demo();
              r.hold(false);
              stroke = s;
              at = a;
              for (let i = 0; i < stroke; i++) showInk(i, pts[i].length - 1);
              showInk(stroke, at);
              placeMarker();
              if (!r.open()) return;
              r.bubble('À toi !');
              await r.say('Continue au point vert, et suis le chemin.');
            })();
            return;
          }
          r.bubble('Reste sur le chemin !');
          void r.say(offs === 1 ? 'Oups ! Reste sur le chemin.' : 'Reste sur le chemin, et continue au point vert.');
        }
      });

      const lift = (e: PointerEvent) => {
        if (e.pointerId !== pointer) return;
        pointer = -1;
        movePen(null);
      };
      view.addEventListener('pointerup', lift);
      view.addEventListener('pointercancel', lift);

      const go = () => {
        waiting = false;
        board.classList.remove('waiting');
      };
      cur = { demo, intro: words.intro, started: () => stroke > 0 || at > 0, go };
      return `write:${level.script}:${char}`;
    },

    async ask(r: Round): Promise<void> {
      const t = cur;
      if (!t) return;
      r.bubble(memory ? 'Écris de mémoire !' : 'Regarde bien !');
      r.hold(true);
      await r.say(t.intro);
      if (!memory) {
        await r.say('Regarde bien comment on l’écrit.');
        await t.demo();
      }
      r.hold(false);
      if (!r.open()) return;
      t.go();
      r.bubble('À toi !');
      await r.say(memory ? 'Écris-la de mémoire. Pose ton doigt sur le point vert.' : 'À toi ! Pose ton doigt sur le point vert, et suis le chemin.');
    },

    async repeat(r: Round): Promise<void> {
      const t = cur;
      if (!t) return;
      if (t.started()) {
        await r.say('Continue au point vert, et suis le chemin.');
        return;
      }
      r.hold(true);
      await r.say(t.intro);
      await t.demo();
      r.hold(false);
      t.go();
      if (r.open()) await r.say('À toi !');
    },
  };
}
