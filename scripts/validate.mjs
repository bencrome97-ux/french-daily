// Validates content/*.json. Run before every commit (the daily sync does this).
// Exits non-zero with a list of problems.
import { readFileSync } from 'node:fs';
import { indexContent, buildCards } from '../src/engine/cards.js';
import { makeExercise } from '../src/engine/exercises.js';

const root = new URL('../content/', import.meta.url);
const verbs = JSON.parse(readFileSync(new URL('verbs.json', root), 'utf8'));
const vocab = JSON.parse(readFileSync(new URL('vocab.json', root), 'utf8'));
const problems = [];
const ids = new Set();

const TIERS = ['foundation', 'core', 'house', 'everyday', 'reflexive'];
for (const v of verbs) {
  const where = `verb ${v.id ?? '?'}`;
  if (!v.id || !/^[a-z0-9-]+$/.test(v.id)) problems.push(`${where}: bad id`);
  if (ids.has('v' + v.id)) problems.push(`${where}: duplicate id`);
  ids.add('v' + v.id);
  if (!v.inf || !v.en) problems.push(`${where}: missing inf/en`);
  if (!Array.isArray(v.forms) || v.forms.length !== 6 || v.forms.some((f) => !f || /\s/.test(f))) problems.push(`${where}: forms must be 6 single words`);
  if (v.pp && !['etre', 'avoir'].includes(v.aux)) problems.push(`${where}: aux must be etre|avoir`);
  if (!v.enForms?.base || !v.enForms?.s || !v.enForms?.past) problems.push(`${where}: enForms needs base, s, past`);
  if (!Array.isArray(v.frames) || !v.frames.length) problems.push(`${where}: needs at least one frame`);
  if (!TIERS.includes(v.tier)) problems.push(`${where}: tier must be one of ${TIERS.join(', ')}`);
  for (const arr of ['enPresent', 'enPast']) if (v[arr] && v[arr].length !== 6) problems.push(`${where}: ${arr} must have 6 entries`);
  if (v.reflexive && v.aux !== 'etre') problems.push(`${where}: reflexive verbs take être`);
}
for (const w of vocab) {
  const where = `word ${w.id ?? '?'}`;
  if (!w.id || !/^[a-z0-9-]+$/.test(w.id)) problems.push(`${where}: bad id`);
  if (ids.has('w' + w.id)) problems.push(`${where}: duplicate id`);
  ids.add('w' + w.id);
  if (!w.fr || !w.en || !w.cat) problems.push(`${where}: missing fr/en/cat`);
  if (!['noun', 'word', 'phrase'].includes(w.kind)) problems.push(`${where}: kind must be noun|word|phrase`);
  if (w.kind === 'noun' && !['m', 'f'].includes(w.g)) problems.push(`${where}: nouns need g m|f`);
}

// Smoke-test: every card must produce a sane exercise at every level.
if (!problems.length) {
  const content = indexContent({ verbs, vocab });
  const { all } = buildCards(content);
  let n = 0;
  for (const card of all) {
    for (let level = 0; level <= 3; level++) {
      for (const seed of [0.1, 0.6, 0.95]) {
        try {
          const ex = makeExercise(card, undefined, content, { level, rng: () => seed });
          n++;
          if (ex.mode === 'choice') {
            const right = ex.options.filter((o) => o.correct).length;
            const labels = new Set(ex.options.map((o) => o.label));
            if (right !== 1) problems.push(`${card.id} L${level}: ${right} correct options`);
            if (labels.size !== ex.options.length) problems.push(`${card.id} L${level}: duplicate options`);
            if (ex.options.length < 2) problems.push(`${card.id} L${level}: too few options`);
          }
          if (ex.mode === 'type' && !ex.accepted?.[0]) problems.push(`${card.id} L${level}: nothing accepted`);
          const texts = [ex.reveal, ex.en, ex.big, ex.prompt, ...(ex.segs ?? []).map((s) => s.v), ...(ex.options ?? []).map((o) => o.label), ...(ex.tiles ?? []), ...(ex.accepted ?? [])];
          if (texts.some((t) => typeof t === 'string' && /undefined|null|\{poss\}/.test(t))) problems.push(`${card.id} L${level}: bad text ${JSON.stringify(texts.filter((t) => /undefined|null|\{poss\}/.test(t ?? '')))}`);
          if (!ex.reveal) problems.push(`${card.id} L${level}: no reveal`);
        } catch (err) {
          problems.push(`${card.id} L${level}: ${err.message}`);
        }
      }
    }
  }
  console.log(`${verbs.length} verbs, ${vocab.length} words, ${all.length} cards, ${n} exercises generated.`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} problem(s):\n` + [...new Set(problems)].slice(0, 60).join('\n'));
  process.exit(1);
}
console.log('✓ content OK');
