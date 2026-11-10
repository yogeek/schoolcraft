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

1. **A parent onboarding at first launch.** Done on 2026-11-10 (`src/screens/welcome.ts`, v3.2): class, then time per sitting (15 min pre-selected), then a coach mark on
   « Parents », and a dot on that button until the parents' area is opened once on the device.
2. **Rewards that are earned, not farmed.** Done on 2026-11-10 (v3.3). Heroes wake up
   with stars (one every 5 stars, derived from the save, so no state v5 was needed), colouring is
   free, blocks come with the finished game (1 to 3 by stars, 1 when replaying a 3-star level),
   and after the chest Pixel offers « À demain ? » (a `rest` screen). See `CLAUDE.md` § Reward
   economy. Its 11 new sentences are recorded and were approved by ear (`ecoute-5.html`).
3. **Building with a model.** Done on 2026-11-10 (v3.4): Pixel's challenges in « Ma
   maison » (towers of 3 to 7 blocks, patterns to copy or continue), see `CLAUDE.md`. Symmetry
   (« construis la même chose de l'autre côté ») is not done. Listening page: `ecoute-6.html`.
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
  - **Empty on 2026-11-10: 3 credits left of 40,000** (the API said so when a request failed).
    New sentences wait for the monthly reset or a top-up.
  - It cannot read the balance (`user_read` missing); a failed request shows it.
  - Cost is about 0.4 credit per character, plus about 1 per speech-to-text check.
  - Always run with `--budget N`, and `--dry-run` first.
- **`ELEVENLABS_API_KEY_OTHER_USER` in the same file: the key to use now.** Free at first (402
  on « Adina »), the owner moved it to the Starter plan on 2026-11-10; it recorded the 10 sentences
  of the earned rewards that day (159 credits). Run it as
  `ELEVENLABS_API_KEY="$ELEVENLABS_API_KEY_OTHER_USER" node scripts/voice/generate.mjs …`.
- **Caution:** `generate.mjs` deletes the clips of sentences that `lines.ts` no longer finds. A
  sentence hidden in an expression `lines.ts` does not follow (`${a ?? b}`) loses its clip: check
  `git status public/voice` after a run.
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
