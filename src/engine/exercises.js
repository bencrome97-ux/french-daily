// Builds a concrete exercise for a card, choosing difficulty from memory strength.
import { presentSentence, pcSentence, render, capitalise, auxForms, startsWithVowel, PERSON_LABELS, agree } from './french.js';
import { distance, stripAccents } from './answer.js';

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 0..3 difficulty from card state, with a little downward variety. */
export function levelFor(state, rng = Math.random) {
  let lvl;
  if (!state || !state.reps) lvl = 0;
  else if (state.s < 4) lvl = 1;
  else if (state.s < 12) lvl = 2;
  else lvl = 3;
  if (lvl > 0 && rng() < 0.2) lvl -= 1;
  return lvl;
}

/** Display segments for a sentence: text runs, a blank, or a highlighted slot. */
function segments(toks, mode, roles = null) {
  // mode: 'blank' | 'highlight' | 'plain'
  const segs = [];
  let buf = '';
  let blanked = false;
  toks.forEach((t, i) => {
    const isSlot = roles ? roles.includes(t.role) : t.slot;
    const sep = i < toks.length - 1 && !t.glue ? ' ' : '';
    if (isSlot && mode !== 'plain') {
      if (mode === 'blank') {
        if (!blanked) {
          if (buf) segs.push({ t: 'text', v: buf });
          buf = '';
          segs.push({ t: 'blank' });
          blanked = true;
        }
        buf += sep;
      } else {
        if (buf) segs.push({ t: 'text', v: buf });
        buf = '';
        segs.push({ t: 'hl', v: t.text });
        buf += sep;
      }
    } else {
      buf += t.text + sep;
    }
  });
  if (buf) segs.push({ t: 'text', v: buf });
  for (const s of segs) if (s.t === 'text') s.v = s.v.replace(/ {2,}/g, ' ');
  // Capitalise the very first character.
  const first = segs[0];
  if (first && first.t === 'text') first.v = capitalise(first.v);
  else if (first && first.t === 'hl') first.v = capitalise(first.v);
  return segs;
}

const sentenceText = (toks) => capitalise(render(toks)) + '.';

/** All present forms of all verbs, for decoys. */
function formPool(content) {
  const pool = [];
  for (const v of content.verbs) {
    v.forms.forEach((f, p) => {
      if ((v.persons ?? [0, 1, 2, 3, 4, 5]).includes(p)) pool.push({ form: f, verb: v, person: p });
    });
  }
  return pool;
}

function describeForm(entry) {
  return `${entry.form} = ${entry.verb.inf}, ${PERSON_LABELS[entry.person]}`;
}

/**
 * Lookalike decoys for a form: closest-spelled forms from other verbs (preferring the same person
 * and verbs the learner has met) plus the closest form of the same verb in another person.
 */
export function formDecoys(verb, person, content, { seen = null, mustStartVowel = null, n = 3 } = {}) {
  const correct = verb.forms[person];
  const pool = formPool(content).filter((e) => e.form !== correct);
  const okStart = (f) => mustStartVowel === null || startsWithVowel(f) === mustStartVowel;
  const score = (e) => {
    let s = distance(e.form, correct) * 10;
    if (e.person !== person) s += 4;
    if (e.verb.id === verb.id) s -= 6; // same verb, other person: classic confusion (vais/va)
    if (seen && !seen.has(e.verb.id) && e.verb.id !== verb.id) s += 6;
    if (Math.abs(e.form.length - correct.length) > 3) s += 8;
    return s;
  };
  const ranked = pool.filter((e) => okStart(e.form)).sort((a, b) => score(a) - score(b));
  const out = [];
  const used = new Set([stripAccents(correct)]);
  let sameVerbCount = 0;
  for (const e of ranked) {
    const key = stripAccents(e.form);
    if (used.has(key)) continue;
    if (e.verb.id === verb.id) {
      if (sameVerbCount >= 1) continue;
      sameVerbCount++;
    }
    used.add(key);
    out.push(e);
    if (out.length >= n) break;
  }
  return out;
}

function verbFrame(verb, rng, purpose = 'present') {
  const frames = verb.frames.filter((f) => (purpose === 'pc' ? f.pc !== false : f.present !== false));
  return pick(frames.length ? frames : verb.frames, rng);
}

function presentExercise(card, verb, content, level, rng, seen) {
  const person = card.person;
  const frame = verbFrame(verb, rng);
  const s = presentSentence(verb, person, frame, rng);
  const full = sentenceText(s.toks);
  const correct = verb.forms[person];
  const base = {
    cardId: card.id,
    verbId: verb.id,
    en: s.en,
    reveal: full,
    speak: full,
    rule: verb.note || null,
  };
  // Elided subject (j’ / m’ / t’ / s’) means decoys must also start with a vowel to be fair.
  const slotIdx = s.toks.findIndex((t) => t.slot);
  const elided = slotIdx > 0 && s.toks[slotIdx - 1].glue;
  const decoys = formDecoys(verb, person, content, { seen, mustStartVowel: elided ? true : null });

  // Level 0 (brand-new card): tell this verb's own forms apart, e.g. nous ___ : sommes / sont / êtes / est.
  if (level === 0) {
    const own = [...new Set(verb.forms.filter((f, p) => p !== person && f !== correct && (verb.persons ?? [0, 1, 2, 3, 4, 5]).includes(p)))]
      .sort((a, b) => distance(a, correct) - distance(b, correct))
      .slice(0, 3);
    if (own.length >= 2) {
      const personOf = (f) => PERSON_LABELS[verb.forms.indexOf(f)];
      // Swap in the closest form from a verb already met (es vs as), when there is one.
      const cross = seen ? decoys.find((d) => d.verb.id !== verb.id && seen.has(d.verb.id) && !own.includes(d.form)) : null;
      const opts = own.slice(0, cross ? 2 : 3).map((f) => ({ label: f, correct: false, why: `${f} is the ${personOf(f)} form` }));
      if (cross) opts.push({ label: cross.form, correct: false, why: describeForm(cross) });
      return {
        ...base,
        type: 'choose-person',
        mode: 'choice',
        tag: 'Fill the gap',
        segs: segments(s.toks, 'blank'),
        hint: `${verb.inf} · ${PERSON_LABELS[person]}`,
        options: shuffle([{ label: correct, correct: true }, ...opts], rng),
        explain: `${PERSON_LABELS[person]} → ${correct}. The full set: ${verb.forms.join(', ')}.`,
      };
    }
    level = 1;
  }

  // "Which verb is this?" only makes sense once several verbs are known; options come only from those.
  const knownOthers = seen ? [...seen].filter((id) => id !== verb.id && content.verbById.has(id)) : [];
  if (level === 1 && knownOthers.length >= 3 && rng() < 0.35) {
    const others = [];
    const usedVerbs = new Set([verb.id]);
    for (const d of formDecoys(verb, person, content, { seen, n: 60 })) {
      if (usedVerbs.has(d.verb.id) || !seen.has(d.verb.id)) continue;
      if (d.verb.forms[person] === correct) continue; // e.g. sentir vs se sentir: same form, ambiguous
      usedVerbs.add(d.verb.id);
      others.push(d);
      if (others.length === 3) break;
    }
    if (others.length >= 2) {
      const options = shuffle(
        [
          { label: verb.inf, sub: verb.en, correct: true },
          ...others.map((d) => ({ label: d.verb.inf, sub: d.verb.en, correct: false, why: `${d.verb.inf} (${d.verb.en}) would be ${d.verb.forms[person]} here` })),
        ],
        rng,
      );
      return {
        ...base,
        type: 'recognise',
        mode: 'choice',
        en: null, // hidden until answered, so the English doesn't give it away
        revealEn: s.en,
        tag: 'Which verb is this?',
        segs: segments(s.toks, 'highlight'),
        options,
        explain: `${correct} = ${verb.inf} (${verb.en}), ${PERSON_LABELS[person]} form.`,
      };
    }
  }
  if (level === 1) {
    const options = shuffle(
      [
        { label: correct, correct: true },
        ...decoys.map((d) => ({ label: d.form, correct: false, why: describeForm(d) })),
      ],
      rng,
    );
    return {
      ...base,
      type: 'choose-form',
      mode: 'choice',
      tag: 'Fill the gap',
      segs: segments(s.toks, 'blank'),
      hint: `${verb.inf} · ${PERSON_LABELS[person]}`,
      options,
      explain: `${correct} = ${verb.inf}, ${PERSON_LABELS[person]}.${decoys[0] ? ` ${describeForm(decoys[0])}.` : ''}`,
    };
  }
  if (level === 2) {
    const words = tileWords(s.toks);
    const extra = decoys.slice(0, 2).map((d) => d.form);
    return {
      ...base,
      type: 'build',
      mode: 'tiles',
      tag: 'Build the sentence',
      prompt: s.en,
      answerTiles: words,
      tiles: shuffle([...words, ...extra], rng),
      explain: `${correct} = ${verb.inf}, ${PERSON_LABELS[person]}.`,
    };
  }
  return {
    ...base,
    type: 'type-form',
    mode: 'type',
    tag: 'Type the verb',
    segs: segments(s.toks, 'blank'),
    hint: `${verb.inf} · ${PERSON_LABELS[person]}`,
    accepted: [correct, ...(verb.alt?.[person] ? [verb.alt[person]] : [])],
    explain: `${correct} = ${verb.inf}, ${PERSON_LABELS[person]}.`,
  };
}

/** Split tokens into tap tiles; elided clitics (j’) become their own tile. */
export function tileWords(toks) {
  return toks.map((t, i) => (i === 0 ? capitalise(t.text) : t.text));
}

function pcExercise(card, verb, content, level, rng) {
  const frame = verbFrame(verb, rng, 'pc');
  const s = pcSentence(verb, frame, rng);
  const full = sentenceText(s.toks);
  const wrongAux = verb.aux === 'etre' ? 'avoir' : 'etre';
  const wrongAuxForm = auxForms(wrongAux)[s.person];
  const auxName = verb.aux === 'etre' ? 'être' : 'avoir';
  const why =
    verb.aux === 'etre'
      ? verb.reflexive
        ? `Reflexive verbs always take être, and the participle agrees: ${s.pp}.`
        : `${verb.inf} is a House of Être verb (movement / change of state), so it takes être, and the participle agrees: ${s.pp}.`
      : `${verb.inf} takes avoir, like most verbs. With avoir the participle doesn't change: ${s.pp}.`;
  const base = { cardId: card.id, verbId: verb.id, en: s.en, reveal: full, speak: full, explain: why, house: verb.aux === 'etre' && !verb.reflexive };

  if (level <= 1) {
    const options = shuffle(
      [
        { label: s.auxForm, sub: auxName, correct: true },
        { label: wrongAuxForm, sub: wrongAux === 'etre' ? 'être' : 'avoir', correct: false },
      ],
      rng,
    );
    return {
      ...base,
      type: 'aux',
      mode: 'choice',
      tag: 'Être or avoir?',
      segs: segments(s.toks, 'blank', ['aux']),
      options,
      wide: true,
    };
  }
  if (level === 2) {
    const ppPlain = verb.pp;
    const candidates = [
      s.answer,
      `${wrongAuxForm} ${ppPlain}`,
      `${s.auxForm} ${verb.aux === 'etre' ? ppPlain : agree(ppPlain, 'etre', 'elle')}`,
      `${s.auxForm} ${verb.inf.replace(/^se /, '').replace(/^s’/, '')}`,
      `${wrongAuxForm} ${agree(ppPlain, 'etre', s.subject)}`,
    ];
    const seenLabels = new Set();
    const opts = [];
    for (const [i, c] of candidates.entries()) {
      if (seenLabels.has(c)) continue;
      seenLabels.add(c);
      opts.push({ label: c, correct: i === 0 });
      if (opts.length === 4) break;
    }
    return {
      ...base,
      type: 'pc-choice',
      mode: 'choice',
      tag: 'Which past form?',
      segs: segments(s.toks, 'blank', ['aux', 'pp']),
      hint: `${verb.inf} · passé composé`,
      options: shuffle(opts, rng),
    };
  }
  return {
    ...base,
    type: 'pc-type',
    mode: 'type',
    tag: 'Type the past',
    segs: segments(s.toks, 'blank', ['aux', 'pp']),
    hint: `${verb.inf} · passé composé`,
    accepted: [s.answer],
  };
}

const ARTICLE_RE = /^(le |la |les |l’|l'|un |une )/i;
export const bareWord = (fr) => fr.replace(ARTICLE_RE, '');

function wordDecoys(word, content, field, rng, n = 3) {
  const same = content.vocab.filter((w) => w.id !== word.id && w.cat === word.cat && w.kind === word.kind);
  const other = content.vocab.filter((w) => w.id !== word.id && w.cat !== word.cat && w.kind === word.kind);
  const out = [];
  const used = new Set([word[field].toLowerCase()]);
  for (const w of [...shuffle(same, rng), ...shuffle(other, rng)]) {
    const k = w[field].toLowerCase();
    if (used.has(k)) continue;
    used.add(k);
    out.push(w);
    if (out.length === n) break;
  }
  return out;
}

function wordExercise(card, word, content, level, rng) {
  const isNoun = word.g === 'm' || word.g === 'f';
  const reveal = word.ex ? word.ex.fr : word.fr;
  const base = {
    cardId: card.id,
    wordId: word.id,
    reveal: word.fr,
    revealEn: word.en,
    example: word.ex || null,
    speak: word.fr,
    explain: word.note || null,
  };
  const maxLevel = word.kind === 'phrase' ? 1 : 3;
  let lvl = Math.min(level, maxLevel);
  if (lvl === 2 && !isNoun) lvl = rng() < 0.5 ? 1 : 3;

  if (lvl === 0) {
    const decoys = wordDecoys(word, content, 'en', rng);
    return {
      ...base,
      type: 'w-fr-en',
      mode: 'choice',
      tag: 'What does this mean?',
      big: word.fr,
      bigLang: 'fr',
      options: shuffle([{ label: word.en, correct: true }, ...decoys.map((d) => ({ label: d.en, correct: false, why: `${d.en} = ${d.fr}` }))], rng),
    };
  }
  if (lvl === 1) {
    const decoys = wordDecoys(word, content, 'fr', rng);
    return {
      ...base,
      type: 'w-en-fr',
      mode: 'choice',
      tag: 'How do you say…',
      big: word.en,
      bigLang: 'en',
      options: shuffle([{ label: word.fr, correct: true }, ...decoys.map((d) => ({ label: d.fr, correct: false, why: `${d.fr} = ${d.en}` }))], rng),
    };
  }
  if (lvl === 2) {
    const bare = bareWord(word.fr);
    const correct = word.g === 'f' ? 'une' : 'un';
    return {
      ...base,
      type: 'w-gender',
      mode: 'choice',
      tag: 'Un or une?',
      segs: [{ t: 'blank' }, { t: 'text', v: ' ' + bare }],
      en: word.en,
      wide: true,
      options: shuffle(
        [
          { label: 'un', sub: 'masculine', correct: correct === 'un' },
          { label: 'une', sub: 'feminine', correct: correct === 'une' },
        ],
        rng,
      ),
      explain: `${bare} is ${word.g === 'f' ? 'feminine' : 'masculine'}: ${word.fr}, ${correct} ${bare}.`,
    };
  }
  return {
    ...base,
    type: 'w-type',
    mode: 'type',
    tag: 'Type it in French',
    big: word.en,
    bigLang: 'en',
    accepted: [word.fr, ...(word.alt || [])],
    ignoreArticle: true,
  };
}

export function makeExercise(card, state, content, { rng = Math.random, seen = null, level = null } = {}) {
  const lvl = level ?? levelFor(state, rng);
  if (card.kind === 'vp') return presentExercise(card, content.verbById.get(card.verbId), content, lvl, rng, seen);
  if (card.kind === 'vpc') return pcExercise(card, content.verbById.get(card.verbId), content, lvl, rng);
  return wordExercise(card, content.wordById.get(card.wordId), content, lvl, rng);
}
