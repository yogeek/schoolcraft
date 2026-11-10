// Game sessions shared by the three activities (Lire, Écrire, Compter).
//
// A session is a few questions ("rounds"). Each game type only knows how to show a question
// (`setup`, without speaking), how to ask it (`ask`), and calls `r.win()` / `r.miss()`. The engine
// does the rest: progress squares, praise, blocks won at the end (by stars), stats for spaced repetition, the review
// question from an earlier level, the end of the session and the reward screen.
//
// Every question has its own number: speech and timers of an old question never talk over (or
// act on) the next one, and nothing runs once the child left the screen.
import { sfx, type SayOpts } from './audio';
import { endSession, starsOf } from './levels';
import { readyHero } from './screens/heroes';
import { rewardScreen } from './screens/reward';
import type { Ctx } from './screens/types';
import { logGame, logGood, record, type ActivityId } from './state';
import { bubble, gameBlocks, giveBlock, h, levelButton, mascot, rand, reducedMotion, setBubble, speakerButton, topBar } from './ui';

export interface Round {
  /** question material (word, blocks, board…) */
  readonly stage: HTMLElement;
  /** answers */
  readonly choices: HTMLElement;
  bubble(text: string): void;
  /** speak, only while this question is shown */
  say(text: string, opts?: SayOpts): Promise<void>;
  /** this question is shown and waits for an answer */
  open(): boolean;
  /** wait, then tell whether this question is still shown */
  wait(ms: number): Promise<boolean>;
  /** a wrong answer (the first one sends the item back to box 1); `el` shakes */
  miss(el?: Element | null): void;
  /** mistakes on this question so far */
  readonly misses: number;
  /** the right answer: praise, then `after` (e.g. say the word), then the next question */
  win(el?: Element | null, after?: () => Promise<void>): Promise<void>;
  /** block the answers for a moment (an animation is running) */
  hold(on: boolean): void;
  /** this question is a review of an earlier level */
  readonly review: boolean;
}

export interface Game {
  /** show a new question without speaking; returns the stats key of the question */
  setup(r: Round): string;
  /** speak the question */
  ask(r: Round): Promise<void>;
  /** "listen again" (default: ask again) */
  repeat?(r: Round): Promise<void> | void;
  /** praise fitting this game */
  praise?: string[];
  /** no review question in this game (the race keeps its board between turns) */
  noReview?: boolean;
  /** number of questions (default: per activity) */
  rounds?: number;
}

const PRAISE = ['Bravo !', 'Super !', 'Génial !', 'Oui, bien joué !', 'Trop bien !', 'Magnifique !'];
/** after a mistake: praise the effort, not the child (process praise) */
const RETRY_PRAISE = ['Tu as réessayé, et tu as trouvé !', "Bravo, tu n'as rien lâché !", 'Oui ! En cherchant bien, tu as trouvé.', 'Bien joué, tu as continué !'];

const ROUNDS: Record<ActivityId, number> = { sounds: 6, write: 5, count: 5 };

export interface SessionSpec {
  activity: ActivityId;
  levelNo: number;
  intro: string;
  game: Game;
  /** a game from an earlier level, for one review question */
  review?: Game | null;
}

export function runSession(ctx: Ctx, spec: SessionSpec): void {
  const { activity, levelNo, game } = spec;
  const n = game.rounds ?? ROUNDS[activity];
  // one review question near the end (spaced, interleaved practice); it does not count for passing
  const plan: Game[] = Array.from({ length: n }, () => game);
  const review = spec.review && !game.noReview ? spec.review : null;
  if (review) plan.splice(n - 1, 0, review);

  let index = 0;
  let firstTry = 0;
  let good = 0;
  let seq = 0;
  let locked = true;
  let held = false;
  let misses = 0;
  let key = '';
  let asked = false;

  const progress = h('div', { class: 'progress', role: 'img', 'aria-label': `${plan.length} questions` });
  plan.forEach((g) => progress.append(h('span', { class: g === game ? '' : 'review' })));
  const bub = bubble();
  const stage = h('div', { class: 'stage' });
  const choices = h('div', { class: 'choices' });
  const screen = h('main', { class: `screen activity act-${activity}` });
  const fox = mascot(90, () => repeat());
  const repeat = () => {
    if (!locked && !held) void (current().repeat ?? current().ask).call(current(), r);
  };
  const current = () => plan[index];

  screen.append(
    topBar(() => ctx.go('home'), levelButton(levelNo, () => ctx.go('map', activity))),
    progress,
    h('div', { class: 'hero small' }, fox, bub, speakerButton(repeat)),
    stage,
    choices,
    h('div', { class: 'ground' }),
  );
  ctx.root.append(screen);

  const react = (cls: 'cheer' | 'hmm') => {
    if (reducedMotion()) return;
    fox.classList.remove('cheer', 'hmm');
    void fox.offsetWidth;
    fox.classList.add(cls);
  };

  let r: Round;

  function makeRound(): Round {
    const my = seq;
    const shown = () => ctx.alive() && my === seq;
    return {
      stage,
      choices,
      review: current() !== game,
      bubble: (text) => setBubble(bub, text),
      say: (text, opts) => (shown() ? ctx.say(text, opts) : Promise.resolve()),
      open: () => shown() && !locked && !held,
      wait: async (ms) => (await ctx.wait(ms)) && shown(),
      get misses() {
        return misses;
      },
      hold(on) {
        held = on;
      },
      miss(el) {
        if (!shown() || locked) return;
        if (misses === 0) record(key, false); // a question counts as missed once
        misses++;
        sfx.oops();
        react('hmm');
        if (el) {
          el.classList.remove('shake');
          void (el as HTMLElement).offsetWidth; // restart the CSS animation
          el.classList.add('shake');
        }
        setBubble(bub, 'Essaie encore !');
      },
      async win(el, after) {
        if (!shown() || locked) return;
        locked = true;
        const isReview = current() !== game;
        if (misses === 0) {
          record(key, true);
          if (!isReview) firstTry++;
        }
        good++;
        logGood();
        sfx.good();
        react('cheer');
        el?.classList.add('good');
        progress.children[index]?.classList.add('done');
        const praise = misses === 0 ? rand(current().praise ?? PRAISE) : rand(RETRY_PRAISE);
        setBubble(bub, praise);
        // praise and item are said separately: no liaison can glue them together
        await ctx.say(praise);
        if (after && shown()) await after();
        if ((await ctx.wait(250)) && shown()) next();
      },
    };
  }

  function setupRound(): void {
    seq++;
    locked = false;
    held = false;
    misses = 0;
    asked = false;
    stage.replaceChildren();
    stage.className = 'stage';
    choices.replaceChildren();
    choices.className = 'choices';
    r = makeRound();
    key = current().setup(r);
  }

  function ask(): void {
    asked = true;
    const g = current();
    if (r.review) {
      setBubble(bub, 'Petite révision !');
      void r.say('Petite révision !').then(() => (r.open() ? g.ask(r) : undefined));
    } else void g.ask(r);
  }

  function next(): void {
    index++;
    if (index >= plan.length) {
      locked = true;
      const rounds = plan.filter((g) => g === game).length;
      const advanced = logGame(activity);
      // blocks come with the finished game, by its stars: a game that does not beat the level's record brings one
      const before = starsOf(activity, levelNo);
      const hadFriend = readyHero() !== null;
      const result = endSession(activity, levelNo, firstTry, rounds);
      const won = gameBlocks(result.stars, before);
      for (const t of won) giveBlock(t);
      return rewardScreen(ctx, won, activity, result, { advanced, newFriend: !hadFriend && readyHero() !== null });
    }
    setupRound();
    ask();
  }

  // the first question is visible right away; it is asked once the level is introduced
  setupRound();
  const first = seq;
  void ctx.say(`Niveau ${levelNo}. ${spec.intro}`).then(async () => {
    if ((await ctx.wait(150)) && first === seq && !locked && misses === 0 && !asked) ask();
  });
}
