// Voice (browser speech synthesis, prototype only) + small synthesized sound effects.
// Later: replace speech for isolated sounds by recorded audio files.

let frVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): void {
  if (!('speechSynthesis' in window)) return;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
  // prefer fr-FR, then "natural"/"google" voices which usually sound better
  voices.sort((a, b) => score(b) - score(a));
  frVoice = voices[0] ?? null;
}
function score(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (v.lang === 'fr-FR') s += 4;
  if (/natural|google|amélie|thomas|audrey/i.test(v.name)) s += 2;
  if (v.localService) s += 1;
  return s;
}
if ('speechSynthesis' in window) {
  pickVoice();
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice);
}

export function speechAvailable(): boolean {
  return 'speechSynthesis' in window;
}

/** Speak a sentence. Resolves when finished (or after a timeout, some browsers never fire `end`). */
export function say(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
  return new Promise((resolve) => {
    if (!speechAvailable()) return resolve();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'fr-FR';
    if (frVoice) u.voice = frVoice;
    u.rate = opts.rate ?? 0.85;
    u.pitch = opts.pitch ?? 1.1;
    const done = () => {
      clearTimeout(t);
      resolve();
    };
    const t = setTimeout(done, 1500 + text.length * 120);
    u.onend = done;
    u.onerror = done;
    speechSynthesis.speak(u);
  });
}

export function stopSpeech(): void {
  if (speechAvailable()) speechSynthesis.cancel();
}

// ---------- sound effects (Web Audio, no files needed) ----------
let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'square', vol = 0.08): void {
  const c = ac();
  if (!c) return;
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
  fanfare(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2));
  },
};
