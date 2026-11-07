# French daily drill: design

## Intent
Ben is a beginner French learner who keeps detailed notes in Notion ("🇫🇷 French Notes": Verbs,
Vocabulary, Useful Phrases, Grammar) and adds to them daily. Vocabulary sticks; **verbs do not**.
Specifically:

1. **Lookalike forms blur together**: va / a / as / vais / vois / voit / fait / est …: he can't
   retrieve which verb and person a short form belongs to, or produce the right one.
2. **être vs avoir** in the passé composé (House of Être).
3. Words not seen for a while fade.

The app is a once-a-day, ~7-minute commute session that fixes those three things, built from his
own notes and updated daily.

## Goals
- Spaced repetition (FSRS) over every verb form and every word, so old items come back on time.
- Verb-first: ~60% verb cards, ~40% vocabulary per session, interleaved.
- Lookalike forms drilled **head to head, in sentences**, with English meaning always shown.
- Explicit être/avoir drills with a House of Être reminder on mistakes.
- Exercise difficulty rises with memory strength: recognise → choose in sentence → build → type.
- Premium, calm "Papier" look (warm paper, Fraunces serif, ink navy, terracotta), auto dark variant.
- Phone-first, one-handed, works offline (Tube), installable to home screen.
- Content refreshed daily from Notion with no extra effort from Ben.

## Non-goals (for now)
- Tenses beyond présent + passé composé (notes cover imparfait/futur; switchable later).
- Accounts, multi-device progress sync, social features, leaderboards.
- Speech recognition.

## Anti-goals
- Duolingo-style noise: hearts, gems, nagging, cartoon mascots.
- Endless feed with no "done for today".
- Drilling isolated forms with no meaning attached.

## Decisions
| Area | Decision | By |
|---|---|---|
| Platform | Static PWA, vanilla JS modules, no build step, GitHub Pages | Claude, agreed |
| Daily update | Scheduled Claude task on Ben's Mac: reads Notion via connector, adds new items to `content/*.json`, validates, commits, pushes | Claude, agreed |
| Progress storage | On-device (localStorage) with export/import backup | Claude |
| Visual style | "Papier" (option A of three mockups) + automatic dark variant | Ben chose A; dark variant Claude's call |
| Scheduler | FSRS-5 default parameters, day granularity, 4am day rollover | Claude |
| Session size | ~16 cards; new cards/day configurable (default 8 verb cards, 8 words) | Claude |
| Tenses | Présent (6 persons) + passé composé (1 card per verb) | Ben (not ready for more) |
| Audio | Device French TTS, tap to play; autoplay off by default (commute) | Claude |

## Content model
`content/verbs.json`: each verb has its six present forms, past participle, auxiliary, English
glosses (base / 3rd person / past) and a few agreement-free sentence *frames* (`au bureau` / `to the
office`). Sentences are assembled at runtime (subject + form + frame) with elision and être
agreement handled in code, so one verb entry yields every person in context.

`content/vocab.json`: word, article, gender, English, category, optional example.

Card ids are stable (`v:aller:2`, `v:aller:pc`, `w:la-gare`) so adding content never disturbs progress.

## Exercise ladder
| Level | Verb present card | Passé composé card | Word card |
|---|---|---|---|
| 0 new / S<1d | Recognise: "Ils **vont** au Japon" → which verb? | être or avoir? | FR → EN choice |
| 1 S<4d | Pick the form in the sentence vs lookalikes | être or avoir? | EN → FR choice |
| 2 S<12d | Build the sentence from tiles (+ decoys) | pick full form incl. agreement | un / une (nouns) |
| 3 S≥12d | Type the missing form | type aux + participle | type the French |

Wrong answers are re-asked later in the same session; only the first attempt is graded.
Every answer gets a one-line explanation naming what the decoy actually was.

## Left to the builder
Exact copy, animation, iconography, verb-map visualisation, accent-forgiveness rules.
