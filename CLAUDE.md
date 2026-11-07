# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

SchoolCraft is a French-language educational PWA for 4–6 year olds (reading: sounds → syllables → words; counting: counting, quick-look, additions). Correct answers earn blocks, which are spent colouring pixel-art heroes (a collectible album) and building a house. Vanilla TypeScript + Vite, no framework, no backend: everything is saved in `localStorage`. All user-facing text and speech is French; the child cannot read, so every instruction is spoken.

## Commands

```bash
npm install
npm run dev        # Vite dev server (--host, reachable from a phone on the LAN)
npm run check      # validates src/content (heroes, words, levels); needs Node >= 22.6 (--experimental-strip-types)
npm run build      # tsc --noEmit && vite build → dist/
npm run preview    # serve dist/ (the service worker is only registered in production builds)
npx tsc --noEmit   # type-check only
```

There is no unit-test runner or linter. CI (`.github/workflows/deploy.yml`) runs `npm ci`, `npm run check`, `npm run build` and deploys `dist/` to GitHub Pages on every push to `main` (Pages source must be "GitHub Actions"). `vite.config.ts` uses `base: './'` so the site works under the `/schoolcraft/` sub-path.

When driving the app in a headless browser, stub `window.speechSynthesis` (headless Chromium has no voices; `say()` otherwise only resolves on its length-based timeout).

## Architecture

**Screens and navigation.** Each screen is a function `xxxScreen(ctx: Ctx)` in `src/screens/` that appends DOM built with the `h()` helper (`src/ui.ts`). `go(name)` in `src/main.ts` is the router: it ticks the play clock, redirects to the `pause` screen when the parents' time limit is exceeded, then calls `beginScreen()` (`src/nav.ts`). `beginScreen()` increments a screen token, stops speech, removes `.overlay` dialogs, scrolls to top and clears the root. It returns `alive()`, `say()` and `wait()` scoped to that screen. **Async work in a screen must go through `ctx.say` / `ctx.wait` and check `ctx.alive()` before acting**, otherwise speech or timers from a screen the child left will talk over, or navigate away from, the next one. `rewardScreen()` is reached from inside an activity, not via `go()`, so it calls `beginScreen()` itself.

**Activities** (`screens/sounds.ts`, `screens/count.ts`) share a pattern: `setupRound()` renders a question without speaking it, `ask()` speaks it, `success()`/`oops()` handle answers, and `locked` plus a per-question `seq` counter keep late speech from an old question out of the next one. The first question is rendered immediately and asked once the level intro has been spoken.

**Content is data**, separate from the code: `src/content/reading.ts` (12 reading levels; `kind` is `sound` | `word` | `build` | `read`), `src/content/counting.ts` (6 counting levels; `mode` is `count` | `flash` | `add`), `src/content/heroes.ts` (12 heroes). `src/levels.ts` derives `MAX_LEVEL` and level names from these files, and clamps the stored levels to them. `scripts/check-content.ts` imports the content files with explicit `.ts` extensions and runs under Node type stripping. Content files must therefore stay import-free and use only erasable TypeScript syntax (no enums or namespaces).

**State** (`src/state.ts`) is a single mutable `state` object, persisted under the `localStorage` key `schoolcraft:v1`, with an internal `version` (currently 2). `sanitize()` repairs malformed saves and migrates old ones: v1 → v2 removed the free grass floor from the build world. Any change to the state shape needs matching code in `sanitize()`, and a `version` bump when old data must be transformed. Stats keys are prefixed (`snd:<text>`, `count:<mode>:<n>`) and hold Leitner boxes 1–3. `pickWeighted(items, keyFn, avoid)` does the spaced repetition, so the key function must produce the same prefixed key that `record()` uses. A level is passed with ≥ 80 % first-try answers (`endSession`).

**Reward economy.** `giveBlock()` gives one block per correct answer, gold every third answer in a row. Colouring spends one block per colour zone (`spendBlock()`). Build mode places and refunds inventory blocks; the ground under the build grid is decorative. Hero grids are 14 rows × 12 columns: `.` is empty, `k` is outline, `e` is eyes (they blink); any other letter is a colour zone from `palette` (6 at most, numbered in key order). `currentHero()` repairs a hero that is fully coloured but not yet marked done. The hero is added to `done` in the same save as its last zone.

**Touch handling** (`installTapFix` in `src/ui.ts`). Buttons and `.px.zone` cells are activated by the code itself on `pointerup`, with 28 px of tolerance, so long presses, slightly moving fingers and taps on the 3D shadow still count. The browser's own click for that gesture is then cancelled: `touchend.preventDefault()` for touch, and clicks with `detail > 0` are swallowed. Without this, a "ghost" click lands on whatever the new screen shows under the finger. Consequences:
- New tappable things should be `<button>`s; their handlers run from a synthetic `el.click()`.
- `button img`, `button svg` and `button span` have `pointer-events: none`.
- Game targets use `touch-action: none`.

**Speech and text** (`src/audio.ts`). `say()` uses Web Speech (`fr-FR`), cancels the previous utterance and never rejects. Sound effects are synthesised with Web Audio (no audio files). Rules for spoken phrases, partly enforced by `npm run check`:
- Never put a word that triggers a liaison (« dans », « les », « c'est », « des », « plus »…) right before an item that starts with a vowel. Write « comme école », not « comme dans école ».
- Put « : » before the item in instructions (« Touche le mot : avion »).
- Don't say « tes/les héros » (some voices say « tes-z-héros »); say « tes amis ».
- Elide before vowels (« L'orange »).
- Keep praise gender-neutral.

Item `speak` strings are spelled so the voice says the sound rather than the letter name (`e` → `euh`, `in` → `hein`, `oi` → `oua`). Bubbles go through `bubble()` / `setBubble()`, which add French no-break spaces (`fr()`). Dialogs use `modal()`, never `window.prompt` / `confirm`.

**Layout.** All CSS is in `src/style.css` and is mobile-first. A `(orientation: landscape) and (max-height: 500px)` block switches the activity, colouring and build screens to a two-column grid for phones held sideways. Grid cells are sized with `--cell` custom properties, not `aspect-ratio`.

**PWA.** `src/sw.js` is a template, not a file in `public/`. A plugin in `vite.config.ts` replaces `__VERSION__` and `__ASSETS__` (the list of hashed build files) and emits `dist/sw.js`; the build fails if a placeholder is left. `/assets/*` and Google Fonts are served cache-first, matched with `ignoreVary` because some servers send `Vary: Origin`. Everything else is network-first, falling back to the cache after 3 s. Each build version gets its own cache, and old ones are deleted on activate.

**Parents area and play time.** The parents area is behind a multiplication question (`parentGate`). The time limit lives in `src/playtime.ts`: it ticks every 5 s, counts only visible time, and resets after a 30-minute break. Free-play screens (home, album, build) are sent to the pause screen by the tick; other screens reach it on their next `go()`.

## Project rules

- Characters and art must be original. The universe is only *inspired* by block-building games: do not reproduce existing characters, names, textures or sounds from Minecraft or any other franchise (see `docs/PLAN.md`). The mascot and heroes are pixel art drawn in code.
- No ads, no tracking, no account, no child data leaves the device.
