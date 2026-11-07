// Pixel's voice. Most sentences are recorded clips (public/voice/, listed in src/voice.json, made by
// scripts/voice/generate.mjs). A text whose sentences are not all recorded is spoken by the device's
// voice (Web Speech API), whose quality depends on the phone or browser. The parents can also choose
// a device voice instead of the recorded one.
import { pieces, sentences, voiceKey } from './voiceKey';

/** dev only: `?mute` replaces the voice by a log in `window.__said` (tests in a browser, no sound) */
const MUTE = import.meta.env.DEV && /[?&]mute\b/.test(location.search);
/** dev only: `?quiet` plays the clips without sound and logs in `window.__voice` how each text was said */
const QUIET = import.meta.env.DEV && /[?&]quiet\b/.test(location.search);
const said: string[] = [];
/** dev: sentences with no recorded clip */
const missing: string[] = [];
const voiceLog: { text: string; via: 'clip' | 'device' }[] = [];
if (import.meta.env.DEV) Object.assign(window, { __said: said, __missing: missing, __voice: voiceLog });

// ---------------------------------------------------------------- recorded clips
let clipList: Record<string, string> | null = null;
const clipsReady = import('./voice.json')
  .then((m) => {
    clipList = m.default as Record<string, string>;
  })
  .catch(() => {});
const CLIP_DIR = `${import.meta.env.BASE_URL}voice/`;

/** the clips of a whole text, or null when one of its sentences was not recorded */
function clipsFor(text: string): string[] | null {
  if (!clipList) return null;
  const out: string[] = [];
  for (const s of sentences(text)) {
    const whole = clipList[voiceKey(s)];
    if (whole) {
      out.push(whole);
      continue;
    }
    // « mouton… bateau… »: recorded word by word
    const ps = pieces(s);
    const each = ps.length > 1 ? ps.map((p) => clipList![voiceKey(p)]) : [undefined];
    if (each.some((f) => !f)) {
      if (import.meta.env.DEV && !missing.includes(s)) missing.push(s);
      return null;
    }
    out.push(...(each as string[]));
  }
  return out;
}

let player: HTMLAudioElement | null = null;
function audioEl(): HTMLAudioElement | null {
  try {
    player ??= new Audio();
    player.muted = QUIET;
    return player;
  } catch {
    return null;
  }
}
/** a hundredth of a second of silence: played on the first touch, it allows the clips on iOS */
const SILENCE = 'data:audio/wav;base64,UklGRnQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YVAAAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==';
let primed = false;
function primePlayer(): void {
  const el = audioEl();
  if (primed || !el || playing) return;
  primed = true;
  el.src = SILENCE;
  void el.play().catch(() => (primed = false));
}
// iOS: play the voice even when the ringer switch is on silent (Safari 16.4+)
try {
  const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = 'playback';
} catch {
  /* ignore */
}

/** the clip being played: stopping it ends the pending `say()` */
let playing: { stop(): void } | null = null;

function playClips(files: string[], rate: number): Promise<boolean> {
  const el = audioEl();
  if (!el) return Promise.resolve(false);
  return new Promise((resolve) => {
    let i = 0;
    let over = false;
    let t = 0;
    const finish = (ok: boolean) => {
      if (over) return;
      over = true;
      clearTimeout(t);
      el.onended = el.onerror = null;
      if (playing === me) playing = null;
      resolve(ok);
    };
    const me = {
      stop() {
        el.pause();
        finish(true);
      },
    };
    playing = me;
    const next = async () => {
      if (over) return;
      if (i >= files.length) return finish(true);
      const src = await clipUrl(files[i++]);
      if (over) return;
      if (!src) return finish(i > 1);
      el.src = src;
      // slower for syllables said one by one, a little quicker when counting along
      el.playbackRate = rate < 0.8 ? 0.9 : rate >= 1 ? 1.08 : 1;
      el.onended = () => (i < files.length ? (t = window.setTimeout(() => void next(), 120)) : finish(true));
      // a clip that cannot load: the device's voice takes over (only if nothing was said yet)
      el.onerror = () => finish(i > 1);
      clearTimeout(t);
      t = window.setTimeout(() => finish(true), 12000);
      el.play().catch(() => finish(i > 1));
    };
    void next();
  });
}

/**
 * A clip as a blob URL: Safari does not play media answered by a service worker without byte
 * ranges, but it plays blobs. The last clips stay ready (counting says the same numbers again).
 */
const blobs = new Map<string, string>();
async function clipUrl(file: string): Promise<string | null> {
  const ready = blobs.get(file);
  if (ready) {
    blobs.delete(file);
    blobs.set(file, ready);
    return ready;
  }
  try {
    const res = await fetch(CLIP_DIR + file);
    if (!res.ok) return null;
    const url = URL.createObjectURL(await res.blob());
    blobs.set(file, url);
    if (blobs.size > 40) {
      const [oldest, old] = blobs.entries().next().value as [string, string];
      blobs.delete(oldest);
      URL.revokeObjectURL(old);
    }
    return url;
  } catch {
    return null;
  }
}

/** Download every clip once, in the background, so the voice works offline (production only). */
export function prefetchVoice(): void {
  if (!('caches' in window) || (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData) return;
  void clipsReady.then(async () => {
    if (!clipList) return;
    try {
      const cache = await caches.open(VOICE_CACHE);
      const wanted = new Set(Object.values(clipList).map((f) => new URL(CLIP_DIR + f, location.href).href));
      // clips of sentences that changed or disappeared
      for (const req of await cache.keys()) if (!wanted.has(req.url)) await cache.delete(req);
      for (const url of wanted) {
        if (document.hidden) await new Promise((r) => document.addEventListener('visibilitychange', r, { once: true }));
        if (!(await cache.match(url))) await cache.add(url).catch(() => {});
      }
    } catch {
      /* the device's voice is still there */
    }
  });
}
/** also used by the service worker (src/sw.js) */
const VOICE_CACHE = 'schoolcraft-voice';

// ---------------------------------------------------------------- device voice (Web Speech API)
let frVoice: SpeechSynthesisVoice | null = null;

function synth(): SpeechSynthesis | null {
  try {
    return 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

/**
 * The voice chosen by the parents on this device: '' = Pixel's recorded voice (the device's best
 * voice for sentences not recorded), 'device' = the device's best voice, otherwise a device voice.
 */
const VOICE_KEY = 'schoolcraft:voice';
export const DEVICE_AUTO = 'device';
function storedVoice(): string {
  try {
    return localStorage.getItem(VOICE_KEY) ?? '';
  } catch {
    return '';
  }
}
const useClips = () => storedVoice() === '';

function frenchVoices(): SpeechSynthesisVoice[] {
  try {
    return synth()?.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('fr')) ?? [];
  } catch {
    return [];
  }
}

function pickVoice(): void {
  const voices = frenchVoices();
  const chosen = storedVoice();
  frVoice = (chosen && voices.find((v) => v.voiceURI === chosen)) || [...voices].sort((a, b) => score(b) - score(a))[0] || null;
}
/** novelty voices (Apple's Eloquence and joke voices) sound robotic or silly */
const NOVELTY = /eddy|flo\b|grand|reed|rocko|sandy|shelley|jacques|albert|bahh|bells|boing|bubbles|cellos|wobble|zarvox|trinoids|whisper|organ|jester|superstar|news|junior|ralph|fred|kathy/i;
function score(v: SpeechSynthesisVoice): number {
  let s = 0;
  const lang = v.lang.replace('_', '-');
  if (lang === 'fr-FR') s += 4;
  if (/premium/i.test(v.name)) s += 5;
  if (/enhanced|améliorée|natural|neural/i.test(v.name)) s += 4;
  if (/google/i.test(v.name)) s += 2;
  if (/amélie|audrey|thomas|marie|denise|eloise|vivienne|henri|rémi|remy/i.test(v.name)) s += 1;
  if (v.localService) s += 1;
  if (NOVELTY.test(v.name)) s -= 10;
  return s;
}
{
  const s = synth();
  if (s) {
    pickVoice();
    s.addEventListener?.('voiceschanged', pickVoice);
  }
}

export function speechAvailable(): boolean {
  return synth() !== null || audioEl() !== null;
}

export interface VoiceInfo {
  id: string;
  label: string;
  /** the browser sends the sentences to an online service to speak them */
  online: boolean;
}
/** French voices of this device, the best ones first (parents area). */
export function voiceList(): VoiceInfo[] {
  return frenchVoices()
    .sort((a, b) => score(b) - score(a))
    .map((v) => ({ id: v.voiceURI, label: v.name, online: !v.localService }));
}
export function voiceChoice(): string {
  return storedVoice();
}
/** recorded sentences (0 until the list is loaded) */
export function recordedCount(): number {
  return clipList ? Object.keys(clipList).length : 0;
}
/** name of the device voice used when a sentence is not recorded (or for everything) */
export function currentVoice(): string {
  return frVoice?.name ?? '';
}
export function setVoiceChoice(id: string): void {
  try {
    if (id) localStorage.setItem(VOICE_KEY, id);
    else localStorage.removeItem(VOICE_KEY);
  } catch {
    /* private mode: the choice lasts until the page is closed */
  }
  pickVoice();
}
/** call `cb` when the browser has loaded (or changed) its voices */
export function onVoices(cb: () => void): void {
  synth()?.addEventListener?.('voiceschanged', cb, { once: true });
}

/**
 * The device's voice says each sentence with its own tone: exclamations a little higher and
 * livelier, questions slightly raised, instructions calm. Without this every sentence has the
 * same flat melody.
 */
function prosody(sentence: string, rate: number, pitch: number): { rate: number; pitch: number } {
  if (sentence.endsWith('!')) return { rate: rate + 0.07, pitch: pitch + 0.15 };
  if (sentence.endsWith('?')) return { rate, pitch: pitch + 0.07 };
  return { rate, pitch };
}

function speakDevice(text: string, opts: { rate?: number; pitch?: number }): Promise<void> {
  return new Promise((resolve) => {
    const s = synth();
    if (!s) return resolve();
    let t = 0;
    const done = () => {
      clearTimeout(t);
      resolve();
    };
    try {
      if (s.speaking || s.pending) s.cancel();
      const parts = sentences(text);
      t = window.setTimeout(done, 1500 + text.length * 120 + parts.length * 300);
      parts.forEach((part, i) => {
        const u = new SpeechSynthesisUtterance(part);
        u.lang = 'fr-FR';
        if (frVoice) u.voice = frVoice;
        const p = prosody(part, opts.rate ?? 0.85, opts.pitch ?? 1.1);
        u.rate = p.rate;
        u.pitch = p.pitch;
        // cut (cancel) or failed: stop waiting; otherwise the promise ends with the last sentence
        u.onerror = done;
        if (i === parts.length - 1) u.onend = done;
        s.speak(u);
      });
    } catch {
      done();
    }
  });
}

/**
 * Speak a text (cutting whatever was being said). Resolves when finished, or after a timeout
 * because some browsers never fire `end`. Never rejects: the games keep working without a voice.
 */
export async function say(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
  stopSpeech();
  const files = useClips() ? clipsFor(text) : null;
  if (MUTE) {
    said.push(text);
    return new Promise((resolve) => setTimeout(resolve, 60));
  }
  if (files) {
    const my = ++sayToken;
    if (await playClips(files, opts.rate ?? 0.85)) {
      if (QUIET) voiceLog.push({ text, via: 'clip' });
      return;
    }
    if (my !== sayToken) return; // cut by another sentence meanwhile
  }
  if (QUIET) {
    voiceLog.push({ text, via: 'device' });
    return new Promise((resolve) => setTimeout(resolve, 60));
  }
  return speakDevice(text, opts);
}
let sayToken = 0;

export function stopSpeech(): void {
  sayToken++;
  playing?.stop();
  try {
    const s = synth();
    if (s && (s.speaking || s.pending)) s.cancel();
  } catch {
    /* ignore */
  }
}

// ---------- sound effects (Web Audio, no files needed) ----------
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    // iOS can leave the context "suspended" or "interrupted" (after a call, or when the app was in background)
    if (ctx.state !== 'running') void ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08): void {
  const c = ac();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch {
    /* audio is a bonus */
  }
}

export const sfx = {
  /** must be called from a user gesture once, to unlock audio on iOS */
  unlock(): void {
    ac();
    primePlayer();
  },
  tap(): void {
    tone(660, 0, 0.06, 'square', 0.05);
  },
  good(): void {
    tone(784, 0, 0.12);
    tone(988, 0.1, 0.12);
    tone(1319, 0.2, 0.25);
  },
  oops(): void {
    tone(220, 0, 0.18, 'triangle', 0.12);
    tone(196, 0.15, 0.25, 'triangle', 0.12);
  },
  place(): void {
    tone(180, 0, 0.08, 'triangle', 0.15);
  },
  /** the syllable drum */
  drum(): void {
    tone(110, 0, 0.14, 'triangle', 0.25);
    tone(70, 0.01, 0.18, 'sine', 0.2);
  },
  /** a token hops one square forward */
  hop(): void {
    tone(520, 0, 0.05, 'square', 0.05);
    tone(780, 0.05, 0.06, 'square', 0.05);
  },
  /** the die rolls */
  roll(): void {
    for (let i = 0; i < 6; i++) tone(300 + Math.random() * 400, i * 0.07, 0.04, 'square', 0.04);
  },
  /** a chest opens */
  chest(): void {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.3, 'triangle', 0.1));
  },
  fanfare(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2));
  },
};
