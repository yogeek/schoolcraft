# AGENTS.md

Instructions for any coding agent working on SchoolCraft.

- **`CLAUDE.md`** is the full guide: commands, architecture, game engine, voice pipeline, and rules
  for spoken sentences. Read it before changing code.
- **`HANDOFF.md`** holds the current state, the proposals waiting for a decision, and the voice budget.
- **`docs/ETUDE.md`** gives the research behind the pedagogical choices.
- **`docs/PLAN.md`** has the roadmap.

## Working rules

- **Everything the child sees or hears is French.** The child cannot read, so every instruction is
  spoken. Keep code comments and commit messages in English, as they are now.
- **Commit and push only when the owner asks.** Every push to `main` deploys to GitHub Pages
  through CI.
- **Before a commit,** run `npx tsc --noEmit`, `npm run check` and `npm run build`. There is no
  unit-test runner.
- **Test in a browser** with the dev hooks:
  - `?mute` logs the speech in `window.__said`;
  - `#play=sounds:N`, `write:N` and `count:N` open a level directly;
  - see `CLAUDE.md` § Testing for phone sizes;
  - `playwright-cli` works headless against `npm run dev`.
- **Async work in a screen** goes through `ctx.say` / `ctx.wait` / `r.say` / `r.wait`, and checks
  `alive()` / `r.open()` before acting.
- **Changing the save shape** needs code in `sanitize()` (`src/state.ts`), plus a `version` bump and
  a migration when old data must change. Levels are stored by number, so inserting a level needs a
  mapping.
- **Content files (`src/content/*.ts`)** stay import-free and use only erasable TypeScript, because
  `scripts/check-content.ts` runs them with Node type stripping.

## Spoken sentences

Changing or adding a sentence means recording it:

```bash
node --experimental-strip-types scripts/voice/lines.ts          # list every sentence
set -a; . ~/.elevenlabs; set +a                                  # same Bash call as the next line
node scripts/voice/generate.mjs --dry-run                        # what would be sent, and its size
node scripts/voice/generate.mjs --budget 200 --max-credits 999999
node scripts/voice/review.mjs ~/perso/schoolcraft-voice-lab/ecoute-N.html voice/ <file of sentences>
```

- **Credits are limited** (see `HANDOFF.md`). Never print the key.
- **`npm run check`** fails when a listed clip is missing or no longer used.
- **The voice cannot be judged by speech-to-text alone.** Ask the owner to listen to new clips on a
  review page.

## Project rules

- Characters and art stay original. The universe is only inspired by block-building games (see
  `docs/PLAN.md`).
- No ads, no tracking, no account, no microphone, and no child data leaves the device.
