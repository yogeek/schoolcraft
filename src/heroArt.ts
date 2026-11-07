// Rendering of heroes (SVG) and celebration particles.
import { regions, type Effect, type Hero } from './content/heroes';

export type Paint = 'all' | 'none' | 'silhouette' | Set<string>;

const EMPTY = '#e9e4d8';

/** Hero as an SVG. `paint` says which colour zones are filled. */
export function heroSVG(hero: Hero, paint: Paint, size = 120, cls = ''): string {
  const w = hero.rows[0].length;
  const h = hero.rows.length;
  let body = '';
  let eyes = '';
  hero.rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      const rect = (fill: string) => `<rect x="${x}" y="${y}" width="1.03" height="1.03" fill="${fill}"/>`;
      if (paint === 'silhouette') {
        body += rect('#3b3b4f');
        return;
      }
      if (ch === 'k') body += rect('#222');
      else if (ch === 'e') eyes += rect('#222');
      else {
        const filled = paint === 'all' || (paint instanceof Set && paint.has(ch));
        body += rect(filled ? hero.palette[ch].color : EMPTY);
      }
    }),
  );
  return `<svg class="hero-svg ${cls}" viewBox="0 0 ${w} ${h}" width="${size}" height="${(size * h) / w}" shape-rendering="crispEdges" aria-hidden="true">${body}<g class="eyes">${eyes}</g></svg>`;
}

export function isComplete(hero: Hero, filled: string[]): boolean {
  return regions(hero).every((r) => filled.includes(r));
}

const PARTICLES: Record<Effect, { chars: string[]; colors: string[] }> = {
  shuriken: { chars: ['✦'], colors: ['#5b6270', '#8a93a3'] },
  coins: { chars: ['●'], colors: ['#f2c230', '#e0a800'] },
  energy: { chars: ['●', '✺'], colors: ['#5ce1ff', '#ffffff', '#3fa3ff'] },
  stars: { chars: ['★', '✧'], colors: ['#f7d038', '#ffffff', '#c39bff'] },
  fire: { chars: ['▲', '●'], colors: ['#f39c12', '#e74c3c', '#f7dc6f'] },
  bubbles: { chars: ['○', '◯'], colors: ['#a8d8f8', '#ffffff', '#3d8fe0'] },
  bolt: { chars: ['ϟ'], colors: ['#f7d038', '#fff3a0'] },
  flowers: { chars: ['✿', '❀'], colors: ['#f06292', '#ffffff', '#5cb85c'] },
  gears: { chars: ['✱', '◆'], colors: ['#9aa5b1', '#e74c3c', '#f7d038'] },
  snow: { chars: ['✻', '✼', '•'], colors: ['#ffffff', '#bfe9ff'] },
  hearts: { chars: ['♥'], colors: ['#ff6fa5', '#ffffff', '#c9b6f2'] },
  planets: { chars: ['●', '★', '✦'], colors: ['#f39c12', '#5dade2', '#f7d038'] },
};

/** Burst of themed particles from the centre of `el`. */
export function burst(el: Element, effect: Effect, count = 18): void {
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const { chars, colors } = PARTICLES[effect];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = chars[i % chars.length];
    p.style.color = colors[i % colors.length];
    p.style.left = `${cx}px`;
    p.style.top = `${cy}px`;
    p.style.fontSize = `${18 + Math.random() * 18}px`;
    document.body.append(p);
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 90 + Math.random() * Math.min(160, r.width);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    p.animate(
      [
        { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${effect === 'shuriken' ? 720 : 180}deg)`, opacity: 1, offset: 0.7 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy * 1.1 + 40}px)) scale(.8) rotate(${effect === 'shuriken' ? 900 : 240}deg)`, opacity: 0 },
      ],
      { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.4,1)' },
    ).finished.then(() => p.remove());
  }
}
