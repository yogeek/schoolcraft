// Vérifie le contenu du jeu (héros dessinés, mots, niveaux) et explique les erreurs en français.
// Lancer : npm run check   (Node 22.6+ : les types TypeScript sont simplement ignorés)
import { COUNT_LEVELS, DICE, NUMBER_WORDS } from '../src/content/counting.ts';
import { HEROES, regions } from '../src/content/heroes.ts';
import { DECOY_SYLLABLES, READING_LEVELS } from '../src/content/reading.ts';

const errors: string[] = [];
const err = (m: string) => errors.push(m);

// ---------------------------------------------------------------- héros
const ROWS = 14;
const COLS = 12;
const ids = new Set<string>();
for (const h of HEROES) {
  const who = `Héros « ${h.name} »`;
  if (ids.has(h.id)) err(`${who} : l'identifiant « ${h.id} » existe déjà`);
  ids.add(h.id);
  if (h.rows.length !== ROWS) err(`${who} : ${h.rows.length} lignes, il en faut ${ROWS}`);
  const zones = regions(h);
  if (zones.length === 0) err(`${who} : aucune couleur dans la palette`);
  if (zones.length > 6) err(`${who} : ${zones.length} couleurs, 6 au maximum (les chiffres restent simples)`);
  for (const z of zones) if (z.length !== 1 || '.ke'.includes(z)) err(`${who} : « ${z} » ne peut pas être une couleur (lettres réservées : . k e)`);
  h.rows.forEach((row, i) => {
    const cells = [...row];
    if (cells.length !== COLS) err(`${who}, ligne ${i + 1} : ${cells.length} cases, il en faut ${COLS}`);
    for (const ch of cells) if (!'.ke'.includes(ch) && !(ch in h.palette)) err(`${who}, ligne ${i + 1} : la lettre « ${ch} » n'est pas dans la palette`);
  });
  const drawn = h.rows.join('');
  for (const z of zones) if (!drawn.includes(z)) err(`${who} : la couleur « ${z} » (${h.palette[z].name}) n'est dessinée nulle part`);
  for (const [z, p] of Object.entries(h.palette)) {
    if (!/^#[0-9a-f]{6}$/i.test(p.color)) err(`${who} : couleur « ${z} » invalide (${p.color}), format attendu #rrggbb`);
    if (!p.name.trim()) err(`${who} : la couleur « ${z} » n'a pas de nom (la voix le dit)`);
  }
  if (!h.line.trim() || !h.title.trim()) err(`${who} : il manque le titre ou la phrase`);
}

// ---------------------------------------------------------------- lecture
// a word with a liaison just before a vowel makes the voice say « dans-z-école »
const LIAISON = /\b(dans|les|des|mes|tes|ses|nos|vos|aux|c'est|plus|très|deux|trois|six|dix|un|mon|ton|son|en|on|nous|vous|ils|elles|tout|chez|quand)\s+[aeiouyéèêàâîôûœ]/i;

READING_LEVELS.forEach((l, i) => {
  const where = `Lire, niveau ${i + 1} (${l.name})`;
  const texts = l.items.map((it) => it.text);
  const dup = texts.filter((t, k) => texts.indexOf(t) !== k);
  if (dup.length) err(`${where} : en double : ${[...new Set(dup)].join(', ')}`);
  if (l.kind !== 'build' && l.items.length < l.choices) err(`${where} : ${l.items.length} éléments pour ${l.choices} choix`);
  if (l.kind !== 'build' && l.choices < 2) err(`${where} : il faut au moins 2 choix`);
  if (!l.intro.trim()) err(`${where} : consigne vide`);
  for (const it of l.items) {
    if (!it.speak.trim()) err(`${where} : « ${it.text} » n'a rien à dire pour la voix`);
    if (l.kind !== 'sound' && (!it.parts || it.parts.join('') !== it.text)) err(`${where} : « ${it.text} » doit être découpé en syllabes (ex. mo-to)`);
    if (l.kind === 'build' && it.parts && it.parts.length > 4) err(`${where} : « ${it.text} » a plus de 4 syllabes (trop large pour l'écran)`);
    if (l.kind === 'read' && !it.pic) err(`${where} : « ${it.text} » n'a pas d'image`);
    if (it.example && LIAISON.test(it.example)) err(`${where} : « ${it.example} » fait une liaison avant une voyelle (écrire « comme école », pas « comme dans école »)`);
  }
  if (l.kind === 'read') {
    const pics = l.items.map((it) => it.pic);
    if (new Set(pics).size !== pics.length) err(`${where} : deux mots ont la même image`);
  }
});
if (new Set(DECOY_SYLLABLES).size !== DECOY_SYLLABLES.length) err('Syllabes pièges : en double');

// ---------------------------------------------------------------- calcul
if (NUMBER_WORDS.length < 11) err('Il manque des nombres en lettres (jusqu’à dix)');
COUNT_LEVELS.forEach((l, i) => {
  const where = `Compter, niveau ${i + 1} (${l.name})`;
  if (l.min < 1 || l.max > 10 || l.min >= l.max) err(`${where} : nombres de ${l.min} à ${l.max} (entre 1 et 10, min < max)`);
  if (l.choices < 2 || l.choices > l.max) err(`${where} : ${l.choices} choix, impossible avec des nombres jusqu'à ${l.max}`);
  if (l.mode === 'flash' && l.max > Math.max(...Object.keys(DICE).map(Number))) err(`${where} : pas de dé pour ${l.max}`);
  if (l.mode === 'add' && l.min < 2) err(`${where} : une addition demande au moins 2 blocs`);
  if (!l.intro.trim()) err(`${where} : consigne vide`);
});

if (errors.length) {
  console.error(`✗ ${errors.length} problème(s) dans le contenu :\n - ${errors.join('\n - ')}`);
  process.exit(1);
}
console.log(`✓ Contenu valide : ${HEROES.length} héros, ${READING_LEVELS.length} niveaux de lecture, ${COUNT_LEVELS.length} niveaux de calcul.`);
