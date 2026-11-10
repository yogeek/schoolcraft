// First launch, for the parents (in writing: Pixel's voice is for the child).
// Step 1: the class, so each activity starts at the right level. Step 2: a time limit per sitting.
// Then a coach mark shows where the parents' area is, and a dot stays on its button until the
// parents have opened it once on this device.
import { applyGrade, GRADE_NAMES } from '../levels';
import { save, state, type Grade } from '../state';
import { fr, h, modal } from '../ui';
import type { Ctx } from './types';

const SEEN = 'schoolcraft:parents-seen';
/** the welcome dialog was just filled in: home shows the coach mark before Pixel speaks */
let coachNext = false;

/** Home asks whether to show the coach mark now (once, right after the welcome dialog). */
export function takeCoach(): boolean {
  const c = coachNext;
  coachNext = false;
  return c;
}

/** The parents' area was opened at least once on this device (shared by every child). */
export function parentsSeen(): boolean {
  try {
    return localStorage.getItem(SEEN) === '1';
  } catch {
    return true; // no storage: never nag
  }
}

export function markParentsSeen(): void {
  try {
    localStorage.setItem(SEEN, '1');
  } catch {
    /* private mode: the dot simply comes back */
  }
}

/** Offered at first launch; 15 min is pre-selected (any value is still possible in the parents' area). */
const CHOICES = [10, 15, 20, 0];
const DEFAULT_LIMIT = 15;

export function welcomeDialog(ctx: Ctx): void {
  const body = h('div', { class: 'welcome-body' });
  const dlg = modal({ title: 'Bienvenue !', body: [body], actions: [], dismissable: false, cls: 'welcome-panel' });
  const step = (n: number) => h('p', { class: 'welcome-step' }, `Étape ${n} sur 2`);

  const askClass = () => {
    const pick = (g: Grade | null) => () => {
      if (g) applyGrade(g);
      else state.settings.grade = 'MS'; // "start at the beginning": do not ask again
      save();
      askLimit();
    };
    const options = (['MS', 'GS', 'CP'] as Grade[]).map((g) => {
      const b = h('button', { class: 'btn grade-btn' }, GRADE_NAMES[g]);
      b.onclick = pick(g);
      return b;
    });
    const later = h('button', { class: 'btn small' }, 'Commencer au début');
    later.onclick = pick(null);
    body.replaceChildren(
      step(1),
      h('p', { class: 'center' }, fr('Pour les parents : dans quelle classe est votre enfant ? Les jeux commenceront au bon niveau.')),
      h('div', { class: 'grade-list' }, ...options),
      later,
    );
  };

  const askLimit = () => {
    let chosen = state.settings.limitMin > 0 ? state.settings.limitMin : DEFAULT_LIMIT;
    const buttons = CHOICES.map((m) => {
      const b = h('button', { class: 'btn limit-btn', 'aria-pressed': String(m === chosen) }, m === 0 ? 'Pas de limite' : `${m} min`);
      if (m === DEFAULT_LIMIT) b.append(h('span', { class: 'limit-hint' }, 'conseillé'));
      b.onclick = () => {
        chosen = m;
        for (const [i, x] of buttons.entries()) x.setAttribute('aria-pressed', String(CHOICES[i] === chosen));
      };
      return b;
    });
    const go = h('button', { class: 'btn green' }, 'C’est parti !');
    go.onclick = () => {
      state.settings.limitMin = chosen;
      save();
      dlg.close();
      coachNext = !parentsSeen();
      ctx.go('home'); // the tiles show the levels of the class; home shows the coach mark
    };
    body.replaceChildren(
      step(2),
      h('p', { class: 'center' }, fr('Combien de temps par séance ? Une fois le temps écoulé, Pixel propose une pause. Après 30 minutes de pause, le compteur repart à zéro.')),
      h('div', { class: 'limit-list', role: 'group', 'aria-label': 'Temps par séance' }, ...buttons),
      go,
      h('p', { class: 'muted center' }, fr('Tout se modifie ensuite dans l’espace Parents.')),
    );
  };

  askClass();
}

/** Points at the « Parents » button of home, once. Any tap closes it, then `then` runs. */
export function coachParents(then: () => void): void {
  const target = document.querySelector<HTMLElement>('.home .parents');
  if (!target) return then();
  const r = target.getBoundingClientRect();
  const ring = h('div', { class: 'coach-ring' });
  Object.assign(ring.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
  const ok = h('button', { class: 'btn small green' }, 'Compris');
  const tip = h(
    'div',
    { class: 'coach-tip', role: 'dialog', 'aria-label': 'Espace parents' },
    h('p', {}, fr('Ici : progrès, temps de jeu, niveau, voix. Protégé par une petite multiplication.')),
    ok,
  );
  tip.style.top = `${r.bottom + 18}px`;
  tip.style.left = `${Math.max(8, r.left)}px`;
  const overlay = h('div', { class: 'overlay coach' }, ring, tip);
  const close = () => {
    if (!overlay.isConnected) return;
    overlay.remove();
    removeEventListener('resize', close);
    then();
  };
  overlay.onclick = close; // the button too (its click bubbles up)
  addEventListener('resize', close);
  document.body.append(overlay);
}
