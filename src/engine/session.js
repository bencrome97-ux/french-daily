// Chooses today's cards and runs the in-session queue (with re-asks for misses).
import { buildCards } from './cards.js';
import { review, Rating, retrievability } from './fsrs.js';
import { shuffle } from './exercises.js';

export const DEFAULT_SETTINGS = {
  newVerbCards: 8,
  newWords: 8,
  maxReviews: 24,
  verbShare: 0.6,
  autoplay: false,
};

/**
 * Plan a session. Returns an ordered array of queue items:
 *   { kind: 'card', card } | { kind: 'intro', verbId }
 */
export function planSession(content, progress, today, { rng = Math.random, extra = false } = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...progress.settings };
  const { verbs, words } = buildCards(content);
  const st = (c) => progress.cards[c.id];
  const dayLog = progress.days?.[today] ?? {};

  const dueSort = (a, b) => {
    const sa = st(a), sb = st(b);
    const ra = retrievability(today - sa.last, sa.s);
    const rb = retrievability(today - sb.last, sb.s);
    return ra - rb;
  };
  const dueVerbs = verbs.filter((c) => st(c)?.reps && st(c).due <= today).sort(dueSort);
  const dueWords = words.filter((c) => st(c)?.reps && st(c).due <= today).sort(dueSort);

  // Split the review budget 60/40 between verbs and words, letting one side borrow unused space.
  const budget = extra ? 12 : settings.maxReviews;
  let vTake = Math.min(dueVerbs.length, Math.round(budget * settings.verbShare));
  let wTake = Math.min(dueWords.length, budget - vTake);
  vTake = Math.min(dueVerbs.length, budget - wTake);
  const revV = dueVerbs.slice(0, vTake);
  const revW = dueWords.slice(0, wTake);

  // New cards: fewer when there's a review backlog.
  const backlog = dueVerbs.length + dueWords.length > budget * 1.5;
  const newVLimit = extra ? 4 : Math.max(0, (backlog ? 3 : settings.newVerbCards) - (dayLog.newV ?? 0));
  const newWLimit = extra ? 4 : Math.max(0, (backlog ? 3 : settings.newWords) - (dayLog.newW ?? 0));
  const newV = verbs.filter((c) => !st(c)?.reps).slice(0, newVLimit);
  const newW = words.filter((c) => !st(c)?.reps).slice(0, newWLimit);

  // Verb stream: reviews shuffled, new cards kept in order (grouped per verb after an intro).
  const seenVerbs = new Set(progress.seenVerbs ?? []);
  const verbStream = interleaveNew(shuffle(revV, rng), newV);
  const wordStream = interleaveNew(shuffle(revW, rng), newW);

  const out = [];
  const introduced = new Set();
  let vi = 0, wi = 0;
  while (vi < verbStream.length || wi < wordStream.length) {
    const vRatio = vi / Math.max(1, verbStream.length);
    const wRatio = wi / Math.max(1, wordStream.length);
    const takeVerb = wi >= wordStream.length || (vi < verbStream.length && vRatio <= wRatio);
    const card = takeVerb ? verbStream[vi++] : wordStream[wi++];
    if (card.verbId && !seenVerbs.has(card.verbId) && !introduced.has(card.verbId)) {
      introduced.add(card.verbId);
      out.push({ kind: 'intro', verbId: card.verbId });
    }
    out.push({ kind: 'card', card });
  }
  return out;
}

/** Spread new cards through the reviews: one new card after every two reviews. */
export function interleaveNew(reviews, fresh) {
  const out = [];
  let r = 0, n = 0;
  while (r < reviews.length || n < fresh.length) {
    for (let k = 0; k < 2 && r < reviews.length; k++) out.push(reviews[r++]);
    if (n < fresh.length) out.push(fresh[n++]);
  }
  return out;
}

/** Grade a first attempt. */
export function ratingFor(result) {
  if (result === 'wrong') return Rating.Again;
  if (result === 'accent') return Rating.Hard;
  return Rating.Good;
}

/**
 * Record a graded answer in progress (mutates and returns progress).
 * isNew is decided from the state before grading.
 */
export function recordAnswer(progress, card, result, today) {
  const prev = progress.cards[card.id];
  const isNew = !prev || !prev.reps;
  progress.cards[card.id] = review(prev, ratingFor(result), today);
  const day = (progress.days[today] ??= { reviews: 0, correct: 0, newV: 0, newW: 0, done: false });
  day.reviews++;
  if (result !== 'wrong') day.correct++;
  if (isNew) card.kind === 'w' ? day.newW++ : day.newV++;
  if (card.verbId) {
    progress.seenVerbs ??= [];
    if (!progress.seenVerbs.includes(card.verbId)) progress.seenVerbs.push(card.verbId);
  }
  return progress;
}

/** "I already know this verb": schedule all its unseen cards as a Good first review. */
export function markVerbKnown(progress, verbCardsList, today) {
  for (const c of verbCardsList) {
    if (!progress.cards[c.id]?.reps) progress.cards[c.id] = review(undefined, Rating.Good, today);
  }
  progress.seenVerbs ??= [];
  const id = verbCardsList[0]?.verbId;
  if (id && !progress.seenVerbs.includes(id)) progress.seenVerbs.push(id);
  return progress;
}

export function streak(progress, today) {
  let n = 0;
  let d = progress.days?.[today]?.done ? today : today - 1;
  while (progress.days?.[d]?.done) {
    n++;
    d--;
  }
  return n;
}

export function dueTomorrow(content, progress, today) {
  const { all } = buildCards(content);
  return all.filter((c) => progress.cards[c.id]?.reps && progress.cards[c.id].due <= today + 1).length;
}
