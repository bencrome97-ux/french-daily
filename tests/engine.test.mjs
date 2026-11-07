import { test } from 'node:test';
import assert from 'node:assert/strict';
import { review, Rating, dayNumber, retrievability } from '../src/engine/fsrs.js';
import { presentSentence, pcSentence, render, capitalise, agree } from '../src/engine/french.js';
import { check, distance } from '../src/engine/answer.js';
import { makeExercise, formDecoys, levelFor } from '../src/engine/exercises.js';
import { indexContent, buildCards, verbCards } from '../src/engine/cards.js';
import { planSession, recordAnswer, streak, markVerbKnown } from '../src/engine/session.js';

const seq = (...xs) => { let i = 0; return () => xs[i++ % xs.length]; };
const first = () => 0;

const aller = { id: 'aller', inf: 'aller', en: 'to go', forms: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'], pp: 'allé', aux: 'etre', enForms: { base: 'go', s: 'goes', past: 'went' }, frames: [{ fr: 'au bureau', en: 'to the office' }] };
const avoir = { id: 'avoir', inf: 'avoir', en: 'to have', forms: ['ai', 'as', 'a', 'avons', 'avez', 'ont'], pp: 'eu', aux: 'avoir', enForms: { base: 'have', s: 'has', past: 'had' }, frames: [{ fr: 'un billet', en: 'a ticket' }] };
const habiter = { id: 'habiter', inf: 'habiter', en: 'to live', forms: ['habite', 'habites', 'habite', 'habitons', 'habitez', 'habitent'], pp: 'habité', aux: 'avoir', enForms: { base: 'live', s: 'lives', past: 'lived' }, frames: [{ fr: 'à Londres', en: 'in London' }] };
const voir = { id: 'voir', inf: 'voir', en: 'to see', forms: ['vois', 'vois', 'voit', 'voyons', 'voyez', 'voient'], pp: 'vu', aux: 'avoir', enForms: { base: 'see', s: 'sees', past: 'saw' }, frames: [{ fr: 'la mer', en: 'the sea' }] };
const lever = { id: 'se-lever', inf: 'se lever', en: 'to get up', reflexive: true, forms: ['lève', 'lèves', 'lève', 'levons', 'levez', 'lèvent'], pp: 'levé', aux: 'etre', enForms: { base: 'get up', s: 'gets up', past: 'got up' }, frames: [{ fr: 'tôt', en: 'early' }] };
const appeler = { id: 's-appeler', inf: 's’appeler', en: 'to be called', reflexive: true, forms: ['appelle', 'appelles', 'appelle', 'appelons', 'appelez', 'appellent'], pp: 'appelé', aux: 'etre', enForms: { base: 'am called', s: 'is called', past: 'was called' }, enPresent: ['am called', 'are called', 'is called', 'are called', 'are called', 'are called'], frames: [{ fr: 'Ben', en: 'Ben' }] };
const vocab = [
  { id: 'la-gare', fr: 'la gare', en: 'train station', g: 'f', cat: 'Travel', kind: 'noun' },
  { id: 'le-train', fr: 'le train', en: 'train', g: 'm', cat: 'Travel', kind: 'noun' },
  { id: 'l-addition', fr: 'l’addition', en: 'bill', g: 'f', cat: 'Eating Out', kind: 'noun' },
  { id: 'le-bus', fr: 'le bus', en: 'bus', g: 'm', cat: 'Travel', kind: 'noun' },
  { id: 'merci', fr: 'merci beaucoup', en: 'thank you very much', cat: 'Phrases', kind: 'phrase' },
];
const content = indexContent({ verbs: [aller, avoir, habiter, voir, lever, appeler], vocab });

test('FSRS: new Good card gets ~3 day interval; Again resets to tomorrow', () => {
  const s1 = review(undefined, Rating.Good, 100);
  assert.equal(s1.due, 103);
  const s2 = review(s1, Rating.Good, 103);
  assert.ok(s2.s > s1.s, 'stability grows on success');
  const s3 = review(s2, Rating.Again, s2.due);
  assert.equal(s3.due, s2.due + 1);
  assert.ok(s3.s < s2.s);
  assert.equal(s3.lapses, 1);
});

test('FSRS: retrievability is 0.9 at t = S', () => {
  assert.ok(Math.abs(retrievability(10, 10) - 0.9) < 1e-9);
});

test('dayNumber rolls over at 4am', () => {
  const a = dayNumber(new Date(2026, 10, 7, 3, 59));
  const b = dayNumber(new Date(2026, 10, 7, 4, 1));
  assert.equal(b - a, 1);
});

test('elision: je + vowel/h verb', () => {
  const s = presentSentence(habiter, 0, habiter.frames[0], first);
  assert.equal(capitalise(render(s.toks)), 'J’habite à Londres');
  assert.equal(s.en, 'I live in London.');
});

test('reflexive pronouns with elision', () => {
  assert.equal(capitalise(render(presentSentence(appeler, 0, appeler.frames[0], first).toks)), 'Je m’appelle Ben');
  assert.equal(capitalise(render(presentSentence(lever, 3, lever.frames[0], first).toks)), 'Nous nous levons tôt');
});

test('third person subject picks il/elle with matching English', () => {
  const s = presentSentence(aller, 2, aller.frames[0], seq(0.9));
  assert.equal(render(s.toks), 'elle va au bureau');
  assert.equal(s.en, 'She goes to the office.');
});

test('passé composé: être agreement and elision', () => {
  const s = pcSentence(aller, aller.frames[0], seq(0, 0.9)); // person 2, elle
  assert.equal(render(s.toks), 'Hier, elle est allée au bureau');
  assert.equal(s.answer, 'est allée');
  const r = pcSentence(lever, lever.frames[0], seq(0.9, 0.9)); // person 5, elles
  assert.equal(render(r.toks), 'Hier, elles se sont levées tôt');
  const h = pcSentence(habiter, habiter.frames[0], first); // je
  assert.equal(render(h.toks), 'Hier, j’ai habité à Londres');
});

test('agree does not double the s', () => {
  assert.equal(agree('assis', 'etre', 'ils'), 'assis');
  assert.equal(agree('assis', 'etre', 'elles'), 'assises');
  assert.equal(agree('mangé', 'avoir', 'elles'), 'mangé');
});

test('check: exact, accent slip, article, alternatives', () => {
  assert.equal(check('Habite', 'habite'), 'exact');
  assert.equal(check('allee', 'allée'), 'accent');
  assert.equal(check('vont', 'va'), 'wrong');
  assert.equal(check('gare', 'la gare', { ignoreArticle: true }), 'exact');
  assert.equal(check("l'addition", 'l’addition', { ignoreArticle: true }), 'exact');
  assert.equal(check('maman', 'la mère / la maman', { ignoreArticle: true }), 'exact');
  assert.equal(check('', 'x'), 'wrong');
});

test('distance ignores accents', () => {
  assert.equal(distance('allé', 'alle'), 0);
  assert.equal(distance('va', 'vas'), 1);
});

test('decoys for "va" are lookalikes and never the answer', () => {
  const d = formDecoys(aller, 2, content).map((x) => x.form);
  assert.equal(d.length, 3);
  assert.ok(!d.includes('va'));
  assert.ok(d.includes('a') || d.includes('vas') || d.includes('voit'), d.join(','));
});

test('decoys after elided subject start with a vowel', () => {
  const d = formDecoys(habiter, 0, content, { mustStartVowel: true }).map((x) => x.form);
  assert.ok(d.every((f) => /^[aeiouyhéèê]/i.test(f)), d.join(','));
});

test('exercise ladder for a verb card', () => {
  const card = { id: 'v:aller:2', kind: 'vp', verbId: 'aller', person: 2 };
  const e0 = makeExercise(card, undefined, content, { level: 0, rng: first });
  assert.equal(e0.type, 'choose-person');
  assert.equal(e0.options.filter((o) => o.correct)[0].label, 'va');
  const e1 = makeExercise(card, undefined, content, { level: 1, rng: () => 0.9 });
  assert.equal(e1.type, 'choose-form');
  assert.equal(e1.options.length, 4);
  assert.equal(new Set(e1.options.map((o) => o.label)).size, 4);
  const e2 = makeExercise(card, undefined, content, { level: 2, rng: first });
  assert.equal(e2.type, 'build');
  assert.deepEqual(e2.answerTiles, ['Il', 'va', 'au', 'bureau']);
  assert.equal(e2.tiles.length, 6);
  const e3 = makeExercise(card, undefined, content, { level: 3, rng: first });
  assert.deepEqual(e3.accepted, ['va']);
});

test('a brand-new verb card drills the verb’s own forms, not "which verb"', () => {
  const card = { id: 'v:aller:3', kind: 'vp', verbId: 'aller', person: 3 };
  const e = makeExercise(card, undefined, content, { seen: new Set(['aller']), rng: () => 0.3 });
  assert.equal(e.type, 'choose-person');
  assert.equal(e.options.find((o) => o.correct).label, 'allons');
  assert.ok(e.options.every((o) => aller.forms.includes(o.label)), e.options.map((o) => o.label).join(','));
  // With another verb already known, one option is that verb's lookalike.
  const e2 = makeExercise({ id: 'v:aller:1', kind: 'vp', verbId: 'aller', person: 1 }, undefined, content, { seen: new Set(['aller', 'avoir']), rng: () => 0.3 });
  assert.ok(e2.options.some((o) => o.label === 'as'), e2.options.map((o) => o.label).join(','));
  assert.equal(new Set(e.options.map((o) => o.label)).size, e.options.length);
});

test('"which verb" only appears with enough known verbs, using only known verbs as options', () => {
  const card = { id: 'v:aller:2', kind: 'vp', verbId: 'aller', person: 2 };
  const learning = { reps: 1, s: 2 };
  for (const seed of [0.05, 0.3, 0.6, 0.9]) {
    const few = makeExercise(card, learning, content, { seen: new Set(['aller', 'avoir']), rng: () => seed, level: 1 });
    assert.notEqual(few.type, 'recognise');
  }
  const seen = new Set(['aller', 'avoir', 'voir', 'habiter']);
  let sawRecognise = false;
  for (const seed of [0.05, 0.1, 0.2, 0.3]) {
    const e = makeExercise(card, learning, content, { seen, rng: () => seed, level: 1 });
    if (e.type === 'recognise') {
      sawRecognise = true;
      assert.ok(e.options.every((o) => o.correct || [...seen].some((id) => content.verbById.get(id).inf === o.label)));
    }
  }
  assert.ok(sawRecognise);
});

test('first session interleaves the first two new verbs', () => {
  const progress = { cards: {}, days: {}, settings: { newVerbCards: 8, newWords: 0 } };
  const plan = planSession(content, progress, 500, { rng: first });
  const ids = plan.filter((q) => q.kind === 'card').map((q) => q.card.verbId);
  assert.deepEqual(ids.slice(0, 4), ['aller', 'avoir', 'aller', 'avoir']);
  assert.equal(plan.filter((q) => q.kind === 'intro').length, 2);
  // Each verb is introduced right before its first card.
  for (const id of ['aller', 'avoir']) {
    const i = plan.findIndex((q) => q.kind === 'card' && q.card.verbId === id);
    assert.ok(plan.slice(0, i).some((q) => q.kind === 'intro' && q.verbId === id));
  }
});

test('passé composé exercises', () => {
  const card = { id: 'v:aller:pc', kind: 'vpc', verbId: 'aller' };
  const e = makeExercise(card, undefined, content, { level: 0, rng: first });
  assert.equal(e.type, 'aux');
  assert.deepEqual(e.options.map((o) => o.label).sort(), ['a', 'est']);
  const e2 = makeExercise(card, undefined, content, { level: 2, rng: first });
  assert.equal(e2.options.filter((o) => o.correct).length, 1);
  assert.equal(new Set(e2.options.map((o) => o.label)).size, e2.options.length);
});

test('word exercises', () => {
  const card = { id: 'w:l-addition', kind: 'w', wordId: 'l-addition' };
  const g = makeExercise(card, undefined, content, { level: 2, rng: first });
  assert.equal(g.type, 'w-gender');
  assert.equal(g.options.find((o) => o.correct).label, 'une');
  const t = makeExercise(card, undefined, content, { level: 3, rng: first });
  assert.equal(t.type, 'w-type');
  const p = makeExercise({ id: 'w:merci', kind: 'w', wordId: 'merci' }, undefined, content, { level: 3, rng: first });
  assert.equal(p.mode, 'choice', 'phrases are never typed');
});

test('levelFor climbs with stability', () => {
  const noVariety = () => 0.99;
  assert.equal(levelFor(undefined, noVariety), 0);
  assert.equal(levelFor({ reps: 1, s: 3 }, noVariety), 1);
  assert.equal(levelFor({ reps: 3, s: 8 }, noVariety), 2);
  assert.equal(levelFor({ reps: 5, s: 30 }, noVariety), 3);
});

test('session: intro before a new verb, respects new-card limits', () => {
  const progress = { cards: {}, days: {}, settings: { newVerbCards: 4, newWords: 2 } };
  const plan = planSession(content, progress, 500, { rng: first });
  const cards = plan.filter((q) => q.kind === 'card');
  assert.equal(cards.filter((q) => q.card.kind !== 'w').length, 4);
  assert.equal(cards.filter((q) => q.card.kind === 'w').length, 2);
  const firstVerbIdx = plan.findIndex((q) => q.kind === 'card' && q.card.verbId === 'aller');
  assert.equal(plan[firstVerbIdx - 1]?.kind, 'intro');
});

test('session: due reviews come back; record + streak', () => {
  const progress = { cards: {}, days: {}, settings: {} };
  const card = buildCards(content).verbs[0];
  recordAnswer(progress, card, 'exact', 500);
  assert.equal(progress.days[500].newV, 1);
  const due = progress.cards[card.id].due;
  const plan = planSession(content, progress, due, { rng: first });
  assert.ok(plan.some((q) => q.kind === 'card' && q.card.id === card.id));
  progress.days[500].done = true;
  progress.days[501] = { done: true };
  assert.equal(streak(progress, 502), 2);
  assert.equal(streak(progress, 501), 2);
});

test('markVerbKnown schedules every card of a verb', () => {
  const progress = { cards: {}, days: {} };
  markVerbKnown(progress, verbCards(aller), 10);
  assert.equal(Object.keys(progress.cards).length, 7);
  assert.ok(progress.seenVerbs.includes('aller'));
});
