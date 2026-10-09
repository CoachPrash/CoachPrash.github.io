# speak — site brief

**URL:** https://coachprash.github.io/speak/ (noindex until listed)
**Repo:** github.com/CoachPrash/CoachPrash.github.io. Moved from iPrash/iprash.github.io (commit 555c9fb) on 9 October 2026
**Type:** static, hand-written app with JSON content. The build does not generate any of it
**Created:** spec started 3 October 2026
**Evidence last checked:** n/a. Content is dialogue. Browser speech support noted in the spec as of Oct 2026

## What it is

Speak is speaking practice for beginners. It uses short, progressive, scripted scenarios in Hindi, French and Mandarin Chinese. In class, a native speaker drives one shared screen and corrects learners live. Alone, a learner practises against the browser's speech synthesis and recognition.

This was "Language Conversation" in the open-items list.

## Why it exists

Prash teaches Hindi and is learning French and Mandarin. Beginners rarely get enough speaking practice. Speak gives a native speaker a ready-made, progressive script to run with a group, and gives a lone learner something to practise with between sessions.

## Status

**M1 built (4 Oct 2026):** content format, checker, Hindi stages 1–4, French and Mandarin greetings, class mode with the formality switch, script view. Solo mode is M2. All content is `draft`.

The spec is `_project/sites/speak-spec.md`. It is the build contract: read it before touching anything in `speak/`.

## Structure

| File | Role |
|---|---|
| `speak/index.html` | Hand-written shell |
| `speak/assets/content.js` | Hand-written. Loads and resolves content |
| `speak/assets/speech.js` | Hand-written. Text-to-speech now, recognition and matching in M2 |
| `speak/assets/app.js` | Hand-written. Router and screens |
| `speak/assets/style.css` | Hand-written |
| `speak/content/**` | Hand-written JSON: ladder, blueprints, language profiles, realizations |
| `_build/check_speak.py` | Content validator. Standard library only |

## Editing rules

- Nothing in `speak/` is generated. Edit files directly.
- Content changes go in `speak/content/`. Run `python _build/check_speak.py` before committing.
- Scenario ids and language codes are permanent once shipped. They are in URLs.
- localStorage prefix `sp.v1.`. Roster and settings only, no scores.

## Content standards

- Every realization carries a review status. `draft` until a native speaker verifies it, then `verified` with name and date. The UI shows the status.
- Prash verifies Hindi. French and Mandarin need a native reviewer before the card is listed.

## Open items

- Next: M2, solo mode. Then M3, French and Mandarin stages 1–4.
- Prash to review the Hindi script views (print → PDF) and mark verified ones.
- Hindi romanization is Prash's ASCII scheme (spec §3.3). All Hindi content follows it.
- Milestones M2 to M4 in the spec.
- Local testing: `python -m http.server` in the repo root, then open http://localhost:8000/speak/. The app loads JSON, so it does not run from file://.
