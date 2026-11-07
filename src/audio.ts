// Voice (browser speech synthesis) + small synthesized sound effects.
// Later: replace speech for isolated sounds by recorded audio files.

let frVoice: SpeechSynthesisVoice | null = null;

function synth(): SpeechSynthesis | null {
  try {
    return 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

function pickVoice(): void {
  const s = synth();
  if (!s) return;
  try {
    const voices = s.getVoices().filter((v) => v.lang.toLowerCase().startsWith('fr'));
    // prefer fr-FR, then "natural"/"google" voices which usually sound better
    voices.sort((a, b) => score(b) - score(a));
    frVoice = voices[0] ?? null;
  } catch {
    frVoice = null;
  }
}
function score(v: SpeechSynthesisVoice): number {
  let s = 0;
  if (v.lang === 'fr-FR') s += 4;
  if (/natural|google|amélie|thomas|audrey/i.test(v.name)) s += 2;
  if (v.localService) s += 1;
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

/**
 * Speak a sentence (cutting whatever was being said). Resolves when finished, or after a timeout
 * because some browsers never fire `end`. Never rejects: the games keep working without a voice.
 */
export function say(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
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
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      if (frVoice) u.voice = frVoice;
      u.rate = opts.rate ?? 0.85;
      u.pitch = opts.pitch ?? 1.1;
      t = window.setTimeout(done, 1500 + text.length * 120);
      u.onend = done;
      u.onerror = done;
      s.speak(u);
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
  fanfare(): void {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.2));
  },
};
