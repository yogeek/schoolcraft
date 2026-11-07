// Records Pixel's voice: every sentence of scripts/voice/lines.json is generated once with ElevenLabs,
// trimmed and encoded (ffmpeg), checked by speech-to-text, and written to public/voice/. The list of
// recorded sentences goes to src/voice.json, which the app reads (src/audio.ts).
//
//   ELEVENLABS_API_KEY=… node scripts/voice/generate.mjs [--limit N] [--max-credits N] [--redo key…]
//
// Clips already recorded are kept (scripts/voice/clips.json), so the script can be stopped and run
// again. Only the fixed text of the game is sent, never anything about the child.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const VOICE = 'FvmvwvObRqIHojkEGh5N'; // « Adina », from the ElevenLabs voice library (needs a paid plan)
const MODEL = 'eleven_v4';
const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) throw new Error('ELEVENLABS_API_KEY is missing');

const args = process.argv.slice(2);
const opt = (name, def) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : def);
const LIMIT = opt('--limit', Infinity);
const MAX_CREDITS = opt('--max-credits', 26000);
const REDO = new Set(args.includes('--redo') ? args.slice(args.indexOf('--redo') + 1).filter((a) => !a.startsWith('--')) : []);

const OUT = `${ROOT}public/voice/`;
const META = `${ROOT}scripts/voice/clips.json`;
mkdirSync(OUT, { recursive: true });
const lines = JSON.parse(readFileSync(`${ROOT}scripts/voice/lines.json`, 'utf8'));
// how to say a few sentences the voice gets wrong (« oi… seau » read « why so »): key → text sent
const SAY_AS = JSON.parse(readFileSync(`${ROOT}scripts/voice/say-as.json`, 'utf8'));
const clips = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : {};
const spentBefore = Object.values(clips).reduce((a, c) => a + (c.cost ?? 0) + (c.sttCost ?? 0), 0);
let spent = 0;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fnv = (s) => {
  let h = 0x811c9dc5;
  for (const ch of new TextEncoder().encode(s)) h = Math.imul(h ^ ch, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
};

/** what is sent to the voice: joy for praise; a final dot on a lone word helps short clips */
function prompt(line) {
  let t = SAY_AS[line.key] ?? line.text;
  if (!/[.!?…:]$/.test(t)) t += '.';
  if (line.tag === 'praise') t = `[happily] ${t}`;
  return t;
}

async function api(path, init, tries = 5) {
  for (let i = 0; ; i++) {
    const res = await fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { 'xi-api-key': KEY, ...init.headers } });
    if (res.ok) return res;
    const body = await res.text();
    if (i < tries && (res.status === 429 || res.status >= 500)) {
      await sleep(1500 * 2 ** i);
      continue;
    }
    throw new Error(`${path} ${res.status} ${body.slice(0, 200)}`);
  }
}

/** PCM 24 kHz → trimmed mono MP3 (silence cut at both ends, a few ms kept) */
function encode(pcm) {
  const trim = 'silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.04';
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', '24000', '-ac', '1', '-i', 'pipe:0', '-af', `${trim},areverse,${trim},areverse`, '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '40k', '-f', 'mp3', 'pipe:1'], { input: pcm, maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`ffmpeg: ${r.stderr}`);
  return r.stdout;
}

const W = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf', 'vingt'];
const plain = (s) =>
  s
    .replace(/\b(\d+)\b/g, (d) => W[Number(d)] ?? d)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]+/g, '');
function similarity(a, b) {
  a = plain(a);
  b = plain(b);
  if (!a.length || !b.length) return 0;
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}

async function transcribe(mp3) {
  const form = new FormData();
  form.append('model_id', 'scribe_v2');
  form.append('language_code', 'fr');
  form.append('file', new Blob([mp3], { type: 'audio/mpeg' }), 'clip.mp3');
  const res = await api('/v1/speech-to-text', { method: 'POST', body: form });
  return { text: (await res.json()).text ?? '', cost: Number(res.headers.get('character-cost') ?? 0) };
}

/** the text the voice says, as written in the app (numbers, « … » and tags are not spoken) */
const expected = (line) => (SAY_AS[line.key] ?? line.text).replace(/…/g, ' ');

async function record(line) {
  const sent = prompt(line);
  let best = null;
  let cost = 0;
  let sttCost = 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await api(`/v1/text-to-speech/${VOICE}?output_format=pcm_24000`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: sent, model_id: MODEL, language_code: 'fr' }),
    });
    const c = Number(res.headers.get('character-cost') ?? 0);
    cost += c;
    spent += c;
    const pcm = Buffer.from(await res.arrayBuffer());
    const mp3 = encode(pcm);
    const dur = pcm.length / 48000;
    // short clips (a syllable, a word) cannot be checked reliably by speech-to-text
    let check = null;
    if (plain(line.text).length >= 10) {
      check = await transcribe(mp3);
      sttCost += check.cost;
      spent += check.cost;
    }
    let score = check ? similarity(expected(line), check.text) : 1;
    if (dur > 1.2 + line.text.length * 0.12) score = Math.min(score, 0.5); // a voice that rambles or loops
    if (!best || score > best.score) best = { mp3, dur, stt: check?.text, score };
    if (best.score >= 0.8) break;
  }
  best.cost = cost;
  best.sttCost = sttCost;
  const file = `${fnv(line.key)}-${createHash('sha1').update(best.mp3).digest('hex').slice(0, 6)}.mp3`;
  const old = clips[line.key]?.file;
  if (old && old !== file && existsSync(OUT + old)) unlinkSync(OUT + old);
  writeFileSync(OUT + file, best.mp3);
  clips[line.key] = { file, text: line.text, sent, dur: Math.round(best.dur * 100) / 100, cost: best.cost, sttCost: best.sttCost, stt: best.stt, score: Math.round(best.score * 100) / 100 };
  return clips[line.key];
}

function saveAll() {
  const listed = new Set(lines.map((l) => l.key));
  for (const k of Object.keys(clips)) if (!listed.has(k)) delete clips[k];
  writeFileSync(META, JSON.stringify(clips, null, 1) + '\n');
  // the app's list: only sentences still in lines.json, sorted for stable diffs
  const keys = new Set(lines.map((l) => l.key));
  const manifest = Object.fromEntries(Object.entries(clips).filter(([k]) => keys.has(k)).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, c]) => [k, c.file]));
  writeFileSync(`${ROOT}src/voice.json`, JSON.stringify(manifest) + '\n');
  // files of sentences that are gone
  const used = new Set(Object.values(manifest));
  for (const f of readdirSync(OUT)) if (f.endsWith('.mp3') && !used.has(f)) unlinkSync(OUT + f);
}

const todo = lines.filter((l) => REDO.has(l.key) || !clips[l.key] || !existsSync(OUT + clips[l.key].file)).slice(0, LIMIT);
console.log(`${todo.length} phrases à enregistrer (déjà : ${Object.keys(clips).length}, crédits déjà dépensés : ${spentBefore})`);
let done = 0;
let stop = false;
const worker = async () => {
  while (!stop && todo.length) {
    if (spentBefore + spent > MAX_CREDITS) {
      stop = true;
      console.log(`limite de crédits atteinte (${MAX_CREDITS})`);
      break;
    }
    const line = todo.shift();
    try {
      const c = await record(line);
      done++;
      if (c.score < 0.8) console.log(`  à vérifier (${c.score}) : « ${line.text} » → « ${c.stt} »`);
      if (done % 25 === 0) {
        saveAll();
        console.log(`${done} faites, ${spent} crédits dans cette session`);
      }
    } catch (e) {
      console.log(`ÉCHEC « ${line.text} » : ${e.message}`);
      if (/40[123]/.test(e.message)) stop = true;
    }
  }
};
await Promise.all([worker(), worker(), worker()]);
saveAll();
console.log(`terminé : ${done} phrases, ${spent} crédits dans cette session, ${spentBefore + spent} au total`);
