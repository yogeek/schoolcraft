// A listening page to find the clips that sound wrong: one button per clip, a box to tick, and the
// list of ticked sentences to copy back. Grouped by risk (a word said alone, praise, after a success).
//
//   node scripts/voice/review.mjs <out.html> [audio URL prefix, default « voice/ »] [file: only these sentences]
import { readFileSync, writeFileSync } from 'node:fs';
import { voiceKey } from '../../src/voiceKey.ts';

const ROOT = new URL('../../', import.meta.url).pathname;
const [out, prefix = 'voice/', only] = process.argv.slice(2);
if (!out) throw new Error('usage: node scripts/voice/review.mjs <out.html> [audio prefix] [sentences file]');
const keep = only ? new Set(readFileSync(only, 'utf8').split('\n').filter((t) => t.trim()).map((t) => voiceKey(t.trim()))) : null;
const lines = JSON.parse(readFileSync(`${ROOT}scripts/voice/lines.json`, 'utf8')).filter((l) => !keep || keep.has(l.key));
const clips = JSON.parse(readFileSync(`${ROOT}scripts/voice/clips.json`, 'utf8'));

const groups = [
  ['Le mot redit après une réussite', (l) => /ça fait : |^(Le|La|L') \S+ !$|^\S+, (comme|le|la|les|un|une|il|elle|on|dans|sur|avec|mon|ma|des|du|pour)\b/.test(l.text)],
  ['Félicitations', (l) => l.tag === 'praise'],
  ['Un mot ou une syllabe seuls', (l) => !/\s/.test(l.text.replace(/ [!?.…]$/, ''))],
  ['Toutes les autres phrases', () => true],
];
const seen = new Set();
const sections = groups.map(([title, test]) => {
  const rows = lines.filter((l) => clips[l.key] && !seen.has(l.key) && test(l));
  rows.forEach((l) => seen.add(l.key));
  return { title, rows };
});
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Écoute des voix de Pixel</title>
<style>
body{font-family:system-ui;max-width:820px;margin:auto;padding:12px 16px 200px}
details{margin:14px 0}summary{font-size:1.2rem;font-weight:700;cursor:pointer}
.r{display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #eee}
.r button{min-width:44px;min-height:44px;font-size:1.2rem}.r span{flex:1}.r.bad span{color:#b00;font-weight:700}
label{display:flex;align-items:center;gap:6px;min-height:44px}
#out{position:fixed;left:0;right:0;bottom:0;background:#fffbe6;border-top:2px solid #333;padding:8px 16px}
textarea{width:100%;height:80px}input[type=search]{width:100%;font-size:1rem;padding:8px}
</style>
<h1>Écoute des voix de Pixel</h1>
<p>Touche ▶ pour écouter. Coche « à refaire » quand l'accent ou le ton ne va pas, puis copie la liste en bas et colle-la dans la conversation. Les cases restent cochées si tu reviens plus tard.</p>
<input type="search" id="q" placeholder="Chercher une phrase…">
${sections
  .map(
    (s, k) => `<details${k < 3 ? ' open' : ''}><summary>${esc(s.title)} (${s.rows.length})</summary>
${s.rows.map((l) => `<div class="r" data-t="${esc(l.text.toLowerCase())}"><button data-f="${clips[l.key].file}" aria-label="Écouter">▶</button><span>${esc(l.text)}</span><label><input type="checkbox" data-k="${esc(l.text)}"> à refaire</label></div>`).join('\n')}
</details>`,
  )
  .join('\n')}
<div id="out"><b>À refaire (<span id="n">0</span>) :</b><textarea id="list" readonly></textarea></div>
<script>
const KEY = ${JSON.stringify(`pixel-review:${out.split('/').pop()}`)}, audio = new Audio(), P = ${JSON.stringify(prefix)};
const marked = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
const sync = () => { localStorage.setItem(KEY, JSON.stringify([...marked])); document.getElementById('list').value = [...marked].join('\\n'); document.getElementById('n').textContent = marked.size; };
document.querySelectorAll('input[data-k]').forEach((c) => { c.checked = marked.has(c.dataset.k); c.closest('.r').classList.toggle('bad', c.checked);
  c.onchange = () => { c.checked ? marked.add(c.dataset.k) : marked.delete(c.dataset.k); c.closest('.r').classList.toggle('bad', c.checked); sync(); }; });
document.querySelectorAll('button[data-f]').forEach((b) => (b.onclick = () => { audio.src = P + b.dataset.f; audio.play(); }));
document.getElementById('q').oninput = (e) => { const q = e.target.value.toLowerCase(); document.querySelectorAll('.r').forEach((r) => (r.hidden = q && !r.dataset.t.includes(q))); if (q) document.querySelectorAll('details').forEach((d) => (d.open = true)); };
sync();
</script>
`;
writeFileSync(out, html);
console.log(`${out} : ${sections.map((s) => `${s.title} ${s.rows.length}`).join(', ')}`);
