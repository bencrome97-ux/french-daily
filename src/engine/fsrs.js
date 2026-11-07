// FSRS-5 scheduler (day granularity). Default parameters from the open-spaced-repetition project.
export const W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];
const DECAY = -0.5;
const FACTOR = 19 / 81;
export const Rating = { Again: 1, Hard: 2, Good: 3, Easy: 4 };

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

export function retrievability(elapsedDays, stability) {
  if (!stability) return 0;
  return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
}

function initDifficulty(g) {
  return clamp(W[4] - Math.exp(W[5] * (g - 1)) + 1, 1, 10);
}

function nextDifficulty(d, g) {
  const delta = -W[6] * (g - 3);
  const dPrime = d + (delta * (10 - d)) / 9;
  return clamp(W[7] * initDifficulty(4) + (1 - W[7]) * dPrime, 1, 10);
}

function recallStability(d, s, r, g) {
  const hard = g === 2 ? W[15] : 1;
  const easy = g === 4 ? W[16] : 1;
  return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp(W[10] * (1 - r)) - 1) * hard * easy);
}

function forgetStability(d, s, r) {
  const sf = W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp(W[14] * (1 - r));
  return Math.min(sf, s);
}

function shortTermStability(s, g) {
  return s * Math.exp(W[17] * (g - 3 + W[18]));
}

/** Day number (integer) for a Date, rolling over at 4am local time. */
export function dayNumber(date = new Date()) {
  const d = new Date(date.getTime() - 4 * 3600 * 1000);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/**
 * Apply a rating to a card state. Returns a new state.
 * state: { s, d, reps, lapses, last, due } (day numbers) or undefined for a new card.
 */
export function review(state, g, today) {
  let s, d;
  const reps = (state?.reps ?? 0) + 1;
  let lapses = state?.lapses ?? 0;
  if (!state || !state.reps) {
    s = W[g - 1];
    d = initDifficulty(g);
  } else {
    const elapsed = Math.max(0, today - state.last);
    if (elapsed === 0) {
      s = shortTermStability(state.s, g);
    } else {
      const r = retrievability(elapsed, state.s);
      s = g === 1 ? forgetStability(state.d, state.s, r) : recallStability(state.d, state.s, r, g);
    }
    d = nextDifficulty(state.d, g);
  }
  if (g === 1) lapses += state?.reps ? 1 : 0;
  s = clamp(s, 0.1, 36500);
  // Desired retention 0.9 => interval equals stability.
  const interval = g === 1 ? 1 : Math.max(1, Math.round(s));
  return { s, d, reps, lapses, last: today, due: today + interval };
}
