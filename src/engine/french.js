// Sentence assembly for French verb drills: subjects, elision, reflexives, passé composé agreement.

export const PERSON_LABELS = ['je', 'tu', 'il / elle', 'nous', 'vous', 'ils / elles'];
const AVOIR = ['ai', 'as', 'a', 'avons', 'avez', 'ont'];
const ETRE = ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'];
const REFLEXIVE = ['me', 'te', 'se', 'nous', 'vous', 'se'];

export const auxForms = (aux) => (aux === 'etre' ? ETRE : AVOIR);

const VOWEL = /^[aeiouyàâäéèêëîïôöùûüœh]/i;
export const startsWithVowel = (w) => VOWEL.test(w);

/** Join a clitic (je/me/te/se) onto the next word, eliding before a vowel or mute h. */
function cl(word, next) {
  if (['je', 'me', 'te', 'se'].includes(word.toLowerCase()) && startsWithVowel(next)) {
    return { text: word.slice(0, -1) + '’', glue: true };
  }
  return { text: word, glue: false };
}

/**
 * Build a list of tokens for a sentence. Each token: { text, glue } where glue means
 * "no space after". The verb slot is marked with { slot: true }.
 */
export function tokens(parts) {
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const next = parts[i + 1];
    const nextText = next ? (typeof next === 'string' ? next : next.text) : '';
    if (typeof p === 'string') {
      const c = cl(p, nextText);
      out.push({ text: c.text, glue: c.glue });
    } else {
      out.push({ ...p, glue: false });
    }
  }
  return out;
}

export function render(toks, { blank = null } = {}) {
  let s = '';
  toks.forEach((t, i) => {
    const text = t.slot && blank !== null ? blank : t.text;
    s += text;
    if (i < toks.length - 1 && !t.glue) s += ' ';
  });
  return s;
}

export function capitalise(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function subjectFor(person, rng) {
  if (person === 2) return rng() < 0.5 ? { fr: 'il', en: 'he' } : { fr: 'elle', en: 'she' };
  if (person === 5) return rng() < 0.5 ? { fr: 'ils', en: 'they' } : { fr: 'elles', en: 'they' };
  return [{ fr: 'je', en: 'I' }, { fr: 'tu', en: 'you' }, null, { fr: 'nous', en: 'we' }, { fr: 'vous', en: 'you' }][person];
}

export function englishPresent(verb, person, frame = {}) {
  if (frame.enForms) return person === 2 ? frame.enForms.s : frame.enForms.base;
  if (verb.enPresent) return verb.enPresent[person];
  return person === 2 ? verb.enForms.s : verb.enForms.base;
}
export function englishPast(verb, person, frame = {}) {
  if (frame.enForms) return frame.enForms.past;
  if (verb.enPast) return verb.enPast[person];
  return verb.enForms.past;
}

const POSS = { I: 'my', you: 'your', he: 'his', she: 'her', we: 'our', they: 'their' };
function englishFrame(frame, subjEn) {
  return (frame.en || '').replace('{poss}', POSS[subjEn] ?? 'their');
}

/** Present-tense sentence for verb + person. Returns { toks, en, form, subject }. */
export function presentSentence(verb, person, frame, rng = Math.random) {
  const subj = subjectFor(person, rng);
  const form = verb.forms[person];
  const parts = [subj.fr];
  if (verb.reflexive) parts.push(REFLEXIVE[person]);
  parts.push({ text: form, slot: true });
  if (frame.fr) parts.push(...frame.fr.split(' '));
  const toks = tokens(parts);
  const enSubj = capitalise(subj.en);
  const fen = englishFrame(frame, subj.en);
  const en = `${enSubj} ${englishPresent(verb, person, frame)}${fen ? ' ' + fen : ''}.`;
  return { toks, en, form, subject: subj.fr };
}

/** Participle agreed with the subject when the auxiliary is être. */
export function agree(pp, aux, subjFr) {
  if (aux !== 'etre') return pp;
  const fem = subjFr === 'elle' || subjFr === 'elles';
  const plural = ['nous', 'vous', 'ils', 'elles'].includes(subjFr);
  // Participles ending in -s (assis, pris) don't take another s.
  let out = pp;
  if (fem) out += 'e';
  if (plural && !out.endsWith('s')) out += 's';
  return out;
}

/**
 * Passé composé sentence. For être verbs we use 3rd person subjects so agreement is unambiguous.
 * Returns { toks, en, aux, auxForm, pp, answer, subject, person }.
 */
export function pcSentence(verb, frame, rng = Math.random) {
  const pool = verb.aux === 'etre' ? [2, 5] : (verb.persons ?? [0, 1, 2, 3, 4, 5]);
  const person = pool[Math.floor(rng() * pool.length)];
  const subj = subjectFor(person, rng);
  const auxForm = auxForms(verb.aux)[person];
  const pp = agree(verb.pp, verb.aux, subj.fr);
  const parts = ['Hier,', subj.fr];
  if (verb.reflexive) parts.push(REFLEXIVE[person]);
  parts.push({ text: auxForm, slot: true, role: 'aux' });
  parts.push({ text: pp, role: 'pp' });
  if (frame.fr) parts.push(...frame.fr.split(' '));
  const toks = tokens(parts);
  const fen = englishFrame(frame, subj.en);
  const en = `Yesterday, ${subj.en} ${englishPast(verb, person, frame)}${fen ? ' ' + fen : ''}.`;
  return { toks, en, aux: verb.aux, auxForm, pp, answer: `${auxForm} ${pp}`, subject: subj.fr, person };
}
