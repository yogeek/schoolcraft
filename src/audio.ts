// Voice (browser speech synthesis) + small synthesized sound effects.
// The voice is the one of the device (Web Speech API): its quality depends on the phone or browser.

let frVoice: SpeechSynthesisVoice | null = null;

/** dev only: `?mute` replaces the voice by a log in `window.__said` (tests in a browser, no sound) */
const MUTE = import.meta.env.DEV && /[?&]mute\b/.test(location.search);
const said: string[] = [];
if (MUTE) (window as unknown as { __said: string[] }).__said = said;

function synth(): SpeechSynthesis | null {
  try {
    return 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

/** the voice chosen by the parents on this device ('' = automatic); voices differ per device */
const VOICE_KEY = 'schoolcraft:voice';
function storedVoice(): string {
  try {
    return localStorage.getItem(VOICE_KEY) ?? '';
  } catch {
    return '';
  }
}

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
  return synth() !== null;
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
  if (id) frVoice = frenchVoices().find((v) => v.voiceURI === id) ?? frVoice;
}
/** call `cb` when the browser has loaded (or changed) its voices */
export function onVoices(cb: () => void): void {
  synth()?.addEventListener?.('voiceschanged', cb, { once: true });
}

/**
 * The voice says each sentence with its own tone: exclamations a little higher and livelier,
 * questions slightly raised, instructions calm. Without this every sentence has the same flat
 * melody. Ellipses (« pa… pi… yon ») and « : » stay inside a sentence.
 */
function sentences(text: string): string[] {
  const parts = text.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((p) => p.trim()).filter(Boolean);
  return parts?.length ? parts : [text];
}
function prosody(sentence: string, rate: number, pitch: number): { rate: number; pitch: number } {
  if (sentence.endsWith('!')) return { rate: rate + 0.07, pitch: pitch + 0.15 };
  if (sentence.endsWith('?')) return { rate, pitch: pitch + 0.07 };
  return { rate, pitch };
}

/**
 * Speak a sentence (cutting whatever was being said). Resolves when finished, or after a timeout
 * because some browsers never fire `end`. Never rejects: the games keep working without a voice.
 */
export function say(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
  if (MUTE) {
    said.push(text);
    return new Promise((resolve) => setTimeout(resolve, 60));
  }
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

export function stopSpeech(): void {
  try {
    synth()?.cancel();
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
