# Handoff

State of SchoolCraft at tag `v3.1` (2026-11-10), and what to do next. Read this first in a fresh
session, then `CLAUDE.md` (architecture, conventions) and `AGENTS.md` (how to work on the repo).

## Where things stand

- Live on GitHub Pages, deployed by CI on every push to `main`. Installed copies update themselves
  on their next launch with a connection.
- Three activities: Lire (31 levels in 7 chapters), Écrire (12 levels), Compter (16 levels). The
  daily adventure, the hero album, the house, up to 4 child profiles and the parents area all work.
- Pixel's voice is recorded (ElevenLabs, eleven_v4, voice « Adina »): 3,035 sentences in
  `public/voice/`. A crawl of all 59 levels on 2026-11-10 found every spoken sentence recorded.
- The owner is testing it with their own child and reports issues by ear and by watching them play.

## Recent work (since v3, commits 17f2871 to 4fa4242)

- **Help grows with each mistake.** In Lire, the 1st mistake names what was touched, the 2nd fades
  the tried answers and gives a clue, the 3rd makes the answer shine. In Compter, Pixel counts
  together with the child.
- **After a success, the syllables light up under the answers as they are said.** The timing comes
  from the clips (`src/voiceMarks.json`). Monosyllables are said with their article (« Le pain ! »).
- **The voice reads sounds and syllables in IPA.** Isolated sounds and syllables are sent between
  slashes, with `[calmly]` before a leading slash (`scripts/voice/lines.ts`). Respellings chosen by
  ear are in `scripts/voice/say-as.json`. All of it is documented in `CLAUDE.md`.
- **The clap game was adjusted:**
  - the drum is audible on phones and stays locked until the instruction is over;
  - words ending in a silent e are left out (their syllable count depends on the region);
  - the syllables are said in one timed clip.
- **The tracing board** is locked during the intro and the demo, and the bubble is never empty.
- **The map** scrolls again when a finger starts on a level square.
- **The first-sound game** shows both written words with their shared beginning in gold after a
  success, only when the letters are the same.
- **The spelling tiles** are cut syllable by syllable (« do-mi-no » is d·o·m·i·n·o, no « in »).
- **The reward screen** announces the next step of the adventure only once.

## Next: proposals waiting for the owner's go

The owner asked for these after a first real use. They were proposed on 2026-11-10 and not started.

1. **A parent onboarding at first launch.** It goes after the class question, in the same dialog,
   in writing (Pixel's voice is for the child). Pre-selecting 15 minutes is a proposal.
   - Step 1: choose a session time limit (10, 15 or 20 min, or no limit).
   - Step 2: a coach mark on the « Parents » button (« Ici : progrès, temps de jeu, niveau, voix.
     Protégé par une petite multiplication. »).
   - Until the parents' area has been visited once, a dot stays on the button.
2. **Rewards that are earned, not farmed.** The problem: blocks come too easily, and the child
   stays in the house or the album long after the exercises. Expected, task-contingent rewards
   lower intrinsic motivation (Lepper 1973; Deci, Koestner and Ryan 1999). The proposal:
   - heroes wake up with progress, for example a chapter finished, shown as « Encore 2 niveaux pour
     réveiller Luna », instead of being bought with blocks;
   - blocks are given per finished game: 1 to 3 by stars, 1 when replaying a 3-star level;
   - a soft end of the session after the chest (« À demain ? »).
   This needs state v5 with a migration in `sanitize()`; heroes already coloured stay awake.
3. **Building with a model.** For example « Construis une tour de 7 blocs » or « Recopie le motif
   rouge, bleu, rouge… ». It is maths of the maternelle programme (counting, patterns, symmetry).
4. **Heroes inside the learning, and a village.**
   - the awakened hero comes along on the daily adventure and appears in the story problems;
   - a short story read aloud when a hero wakes up, with one comprehension question;
   - each finished chapter adds a building to a village where the heroes live;
   - small surprise rewards, given unpredictably.

The recommended order is 1, 2, 3, 4. The owner had not yet chosen when this file was written.

## Other open ideas

These come from `docs/PLAN.md` § 7: subtraction and numbers beyond 20, joined cursive words, short
stories to read with questions, and a pre/post test with families.

## Voice budget and tools

- **Main key: `ELEVENLABS_API_KEY` in `~/.elevenlabs`** (Starter plan, the owner's account).
  - It cannot read the balance (`user_read` missing), so ask the owner to look at the dashboard.
  - By our own count it was close to empty after the IPA re-recording. Small runs (up to 45 credits)
    still worked on 2026-11-10.
  - Cost is about 0.4 credit per character, plus about 1 per speech-to-text check.
  - Always run with `--budget N`, and `--dry-run` first.
- **`ELEVENLABS_API_KEY_OTHER_USER` in the same file: another person's account** (10,000 credits),
  offered by the owner « if needed ». It is probably a free plan, where the « Adina » library voice
  is refused by the API (402). This key is untested, so check before relying on it.
- **Workflow:**
  1. Change the text in the code.
  2. Run `node --experimental-strip-types scripts/voice/lines.ts`.
  3. Run `node scripts/voice/generate.mjs --dry-run`, then record with `--budget`.
  4. Make a listening page with `scripts/voice/review.mjs` for the owner to tick the bad clips.
  5. Fix the ticked clips (IPA, a respelling in `say-as.json`, or a different carrier sentence).
- **The voice lab lives outside the repo, in `~/perso/schoolcraft-voice-lab`.**
  - Serve it with `python3 -m http.server 8090`.
  - `voice/` is a symlink to `public/voice/`.
  - The pages there (`ecoute*.html`, `phonetique.html`, `omar.html`…) are the listening rounds;
    each review page stores its ticks under its own localStorage key.
  - To read the owner's ticks, open the page with claude-in-chrome in their Chrome and read
    `localStorage`.

## What the owner cares about (from this collaboration)

- **French app, for 4 to 7 year olds, used with a real child.** They report what the child does
  (tapping the drum too early, finger on the board during the demo) and what they hear (accents,
  drawled syllables).
- **Voice quality matters a lot.** Every sentence is in the same recorded voice. Isolated syllables
  must not sound English, emotional or drawled. They choose between variants by ear, on a lab page.
- **Pedagogy is grounded in sources.** See `docs/ETUDE.md`, and cite Eduscol or research when
  making a choice.
- **Commits and pushes only when they say so.** Each push so far was approved in chat. They answer
  in French; replies are in French, plain, without em dashes.
