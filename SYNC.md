# Daily Notion sync

This is the procedure the daily scheduled Claude task follows. It keeps `content/*.json` in step
with Ben's Notion notes ("🇫🇷 French Notes"), then publishes via GitHub Pages.

## Sources (Notion)
| Page | ID | Feeds |
|---|---|---|
| 🇫🇷 French Notes (parent) | `373f5882-2394-81e7-a344-ff38646e10cc` | check for new child pages |
| 🔵 Verbs | `373f5882-2394-81a3-ac84-f7d1483f29ca` | `content/verbs.json` |
| 🟢 Vocabulary | `373f5882-2394-81ac-90c1-fa34d6c15b0c` | `content/vocab.json` (kind `noun`/`word`) |
| 🟡 Useful Phrases | `373f5882-2394-813d-8775-cda185b207f6` | `content/vocab.json` (kind `phrase`, category `Phrases: …`) |

## Steps
1. `cd` into the repo and `git pull --ff-only`.
2. Fetch the three pages above with the Notion connector.
3. Find items in Notion that are **not yet** in the JSON:
   - Verbs: match on the infinitive (ignore accents, case, and a leading `se `/`s’`).
     Skip the empty template row (`XXX — To xxx`).
   - Words and phrases: match on the French text without its article (ignore accents and case).
4. Add each new item at the **end** of the right file, following the schema of existing entries:
   - **Verb**: `id` (ascii slug), `inf`, `en`, `group` (`er`/`ir`/`re`/`irregular`/`er-spelling`),
     `tier` (`everyday` or `reflexive`; `house` for new House of Être verbs), six correct present
     `forms` (verb only, no pronoun), `pp`, `aux` (`etre`/`avoir`), `enForms` {base, s, past},
     optional `enPresent`/`enPast` (6 entries) for irregular English, `reflexive: true` where needed,
     and 1–3 `frames` {fr, en}. Frames must read naturally for **every** person and in the past
     (`Hier, elle est …`): no French possessives (mon/ton/son), nothing that needs gender agreement.
     Use `{poss}` in the English for his/her/their. Mark a frame `"pc": false` if it sounds wrong in
     the past, or the verb `"pc": false` if its past is odd or agreement is irregular. Add a short
     `note` from Ben's notes where useful.
   - **Word**: `id` (slug of the French, prefix `p-` for phrases; must be unique), `fr` with article
     (`la gare`, `l’addition` with a curly apostrophe), `en`, `cat` (the Notion heading), `kind`
     (`noun` needs `g`: `m`/`f`; `word` for adjectives, numbers, plural-only nouns; `phrase`),
     optional `ex` {fr, en} from the Example column.
   - If Ben's notes contain a typo (e.g. a misspelled conjugation), use the correct French in the
     JSON and mention the correction in the commit message. Never edit Notion.
5. **Never delete an item or change an existing `id`**. Progress is stored per id on Ben's phone.
   Small edits to existing items (better English, extra example) are fine.
6. Run `node scripts/validate.mjs` and `node --test tests/`. Fix content until both pass.
7. Set `content/meta.json` → `updated` to the current ISO time.
8. If anything changed: commit as `Sync from Notion: +N verbs, +M words` (list the new items and any
   typo corrections in the body) and `git push`. If nothing is new, update nothing and don't commit.
