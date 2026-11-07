// Procedural pixel-art: 16×16 block textures and the mascot "Pixel" the fox.
// Everything is original artwork generated in code (no external assets).
import type { BlockType } from './state';

function rng(seed: number): () => number {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

type RGB = [number, number, number];
const shade = ([r, g, b]: RGB, k: number): string =>
  `rgb(${Math.max(0, Math.min(255, r * k)) | 0},${Math.max(0, Math.min(255, g * k)) | 0},${Math.max(0, Math.min(255, b * k)) | 0})`;

const BASE: Record<BlockType, RGB> = {
  grass: [134, 96, 67],
  dirt: [134, 96, 67],
  wood: [176, 133, 80],
  stone: [128, 128, 128],
  glass: [190, 230, 245],
  gold: [250, 205, 60],
};

const cache = new Map<string, string>();

export function blockTexture(type: BlockType | 'plaque'): string {
  const hit = cache.get(type);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const g = c.getContext('2d')!;
  const rand = rng(type.length * 97 + type.charCodeAt(0));
  const px = (x: number, y: number, col: string) => {
    g.fillStyle = col;
    g.fillRect(x, y, 1, 1);
  };

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = 0.82 + rand() * 0.3;
      switch (type) {
        case 'grass': {
          const edge = 3 + ((x * 7) % 3 === 0 ? 1 : 0);
          px(x, y, y < edge ? shade([95, 170, 60], n) : shade(BASE.dirt, n));
          break;
        }
        case 'wood': {
          const plank = y % 4 === 3 || (x === (y < 8 ? 5 : 11) && y % 4 !== 3);
          px(x, y, shade(BASE.wood, plank ? 0.7 : n));
          break;
        }
        case 'glass': {
          const frame = x === 0 || y === 0 || x === 15 || y === 15;
          const shine = (x - y === 4 || x - y === 6) && x > 4 && x < 13;
          px(x, y, frame ? '#e8f8ff' : shine ? '#ffffff' : shade(BASE.glass, 0.95 + rand() * 0.05));
          break;
        }
        case 'gold': {
          const spark = rand() > 0.93;
          px(x, y, spark ? '#fff7c2' : shade(BASE.gold, n));
          break;
        }
        case 'plaque':
          px(x, y, shade([214, 206, 190], 0.93 + rand() * 0.1));
          break;
        default:
          px(x, y, shade(BASE[type], n));
      }
    }
  }
  // bevel to give the "block" look
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.fillRect(0, 0, 16, 1);
  g.fillRect(0, 0, 1, 16);
  g.fillStyle = 'rgba(0,0,0,.25)';
  g.fillRect(0, 15, 16, 1);
  g.fillRect(15, 0, 1, 16);

  const url = c.toDataURL();
  cache.set(type, url);
  return url;
}

// Mascot: a little block fox. '.' = transparent.
const FOX = [
  '.o..........o.',
  '.oo........oo.',
  '.oko......oko.',
  '.oooooooooooo.',
  'oooooooooooooo',
  'oowkooooooowko',
  'oookoooooookoo',
  'ooooooooooooo.',
  '.owwwwkkwwwwo.',
  '..wwwwwwwwww..',
  '...wwwwwwww...',
  '....oooooo....',
  '...oo.oo.oo...',
];
const FOX_COLORS: Record<string, string> = { o: '#f08a24', k: '#2b1a10', w: '#fff4e6' };

export function foxSVG(size = 120): string {
  const w = FOX[0].length;
  const h = FOX.length;
  let rects = '';
  FOX.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const col = FOX_COLORS[ch];
      if (col) rects += `<rect x="${x}" y="${y}" width="1.02" height="1.02" fill="${col}"/>`;
    }),
  );
  return `<svg class="fox" viewBox="0 0 ${w} ${h}" width="${size}" height="${(size * h) / w}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

export const BLOCK_NAMES: Record<BlockType, string> = {
  grass: 'herbe',
  dirt: 'terre',
  wood: 'bois',
  stone: 'pierre',
  glass: 'verre',
  gold: 'or',
};
