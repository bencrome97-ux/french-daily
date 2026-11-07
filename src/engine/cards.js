// Turns content (verbs + vocab) into a flat list of reviewable cards with stable ids.

export const NEW_PERSON_ORDER = [2, 0, 1, 5, 3, 4];

export function verbCards(verb) {
  const persons = verb.persons ?? [0, 1, 2, 3, 4, 5];
  const ordered = NEW_PERSON_ORDER.filter((p) => persons.includes(p));
  const cards = ordered.map((p) => ({ id: `v:${verb.id}:${p}`, kind: 'vp', verbId: verb.id, person: p }));
  if (verb.pp && verb.pc !== false) cards.push({ id: `v:${verb.id}:pc`, kind: 'vpc', verbId: verb.id });
  return cards;
}

export function wordCard(word) {
  return { id: `w:${word.id}`, kind: 'w', wordId: word.id };
}

export function buildCards(content) {
  const verbs = content.verbs.flatMap(verbCards);
  const words = content.vocab.map(wordCard);
  return { verbs, words, all: [...verbs, ...words] };
}

export function indexContent(content) {
  const verbById = new Map(content.verbs.map((v) => [v.id, v]));
  const wordById = new Map(content.vocab.map((w) => [w.id, w]));
  return { ...content, verbById, wordById };
}

/** Mastery bucket from a card state. */
export function mastery(state) {
  if (!state || !state.reps) return 'new';
  if (state.s < 7) return 'learning';
  if (state.s < 21) return 'familiar';
  return 'solid';
}

/** Overall mastery for a verb from its card states. */
export function verbMastery(verb, progress) {
  const cards = verbCards(verb);
  const states = cards.map((c) => progress.cards[c.id]);
  if (states.every((s) => !s || !s.reps)) return { bucket: 'new', score: 0 };
  const score = states.reduce((a, s) => a + (s && s.reps ? Math.min(1, s.s / 21) : 0), 0) / cards.length;
  const bucket = score >= 0.95 ? 'solid' : score >= 0.4 ? 'familiar' : 'learning';
  return { bucket, score };
}
