# French Daily

A calm, once-a-day French drill built from my own Notion notes. Verbs first (with lookalike forms
head to head, and être vs avoir), vocabulary woven in, spaced repetition underneath.

- **Use it**: open the GitHub Pages link on your phone → Share → *Add to Home Screen*. Works offline.
- **Progress** lives on the phone. Back it up from Settings → *Back up progress*.
- **Content** comes from Notion via a daily Claude task. See [SYNC.md](SYNC.md).
- **Design**: [docs/superpowers/specs/2026-11-07-french-drill-design.md](docs/superpowers/specs/2026-11-07-french-drill-design.md).

## Develop
```
npm test             # engine tests
npm run validate     # content checks (generates every exercise for every card)
npm run serve        # http://localhost:8080
```
No build step: plain ES modules, HTML and CSS.
