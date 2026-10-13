# speak — site brief

**URL:** https://coachprash.github.io/speak/ (noindex until listed)
**Repo:** github.com/CoachPrash/CoachPrash.github.io. Moved from iPrash/iprash.github.io (commit 555c9fb) on 9 October 2026
**Type:** static, hand-written app with JSON content. The build does not generate any of it
**Created:** spec started 3 October 2026
**Evidence last checked:** n/a. Content is dialogue. Browser speech support noted in the spec as of Oct 2026

## What it is

Speak is speaking practice for beginners. It uses short, progressive, scripted scenarios in Hindi, Spanish (Colombian), French and Mandarin Chinese. Its method is **chunking**, after Michael Lewis's Lexical Approach: learners take in whole chunks of language first and notice the grammar last. The site says so to students, and uses "chunk" throughout, never "vocabulary" (spec §3.9, §4.1). In class, a native speaker drives one shared screen and corrects learners live. Alone, a learner practises against the browser's speech synthesis and recognition.

This was "Language Conversation" in the open-items list.

## Why it exists

Prash teaches Hindi and is learning French and Mandarin. Beginners rarely get enough speaking practice. Speak gives a native speaker a ready-made, progressive script to run with a group, and gives a lone learner something to practise with between sessions.

## Status

**As of 14 October 2026:** 4 languages, 11 topic stages, 43 scenarios, 172 realizations, all `draft`. Class mode, solo mode, Review flashcards, review packs and the device check are built. Building pauses until the drafts are reviewed and used in class. **The current status, every decision and the next steps are in `_project/sites/speak-status.md`.** Milestone history is under Open items below.

The spec is `_project/sites/speak-spec.md`. It is the build contract: read it before touching anything in `speak/`.

## Structure

| File | Role |
|---|---|
| `speak/index.html` | Hand-written shell |
| `speak/assets/content.js` | Hand-written. Loads and resolves content |
| `speak/assets/speech.js` | Hand-written. Text-to-speech, recognition, matching. No DOM code |
| `speak/assets/app.js` | Hand-written. Router and screens |
| `speak/assets/solo.js` | Hand-written. Solo mode screen |
| `speak/assets/review.js` | Hand-written. Review flashcards |
| `speak/assets/check.js` | Hand-written. Check your device |
| `speak/assets/style.css` | Hand-written |
| `speak/content/**` | Hand-written JSON: ladder, blueprints, language profiles, realizations |
| `_build/check_speak.py` | Content validator. Standard library only |
| `_build/test_speech.html` | Matching tests. Open over http |
| `_build/test_speech.js` | The same tests in Node: `node _build/test_speech.js` |

## Editing rules

- Nothing in `speak/` is generated. Edit files directly.
- Content changes go in `speak/content/`. Run `python _build/check_speak.py` before committing.
- Scenario ids and language codes are permanent once shipped. They are in URLs.
- localStorage prefix `sp.v1.`. Roster and settings only, no scores.

## Content standards

- Every realization carries a review status. `draft` until a native speaker verifies it, then `verified` with name and date. The UI shows the status.
- Prash verifies Hindi. Spanish, French and Mandarin need a native reviewer before the card is listed.

## Open items

- **M2.5 done (11 Oct 2026):** chunks (key, steps, echo, notice, method on the site) and gender (roster, solo setting, forms per person, wrong-gender check, two voice pickers). Used in Prash's Sunday class on 11 Oct 2026.
- **M3 drafted (12 Oct 2026):** French and Mandarin stages 1–4, chunk-first, all `draft`. Next: script-view PDFs to native-speaker reviewers.
- **M4 drafted (12 Oct 2026):** blueprints for stages 5–9 (likes, routine, food stall, directions, small talk), Hindi stages 5–9 (`draft`), and the Review flashcards (Flip and Say it). Part 4 the same day: French and Mandarin stages 5–9, all `draft`. French shopping is vous only.
- **Spanish drafted (13 Oct 2026):** Colombian Spanish (`es-CO`), stages 1–9, one pass from the French course. Usted default, tú second; vos not taught. Colombian touches: ¿me regala…?, con mucho gusto, tinto, esfero, queda cerquita, pesos. All `draft`, waiting for a native reviewer. Switching to Mexican later means the profile locale plus a few culture words (items, places, partner names).
- **M4.5 (13 Oct 2026):** review pack per language (`#hi/script`, one PDF with a reviewer's guide), Check your device (`#check`), and a new stage 2 `repair` (When you don't understand) in all four languages, so stages 2–9 became 3–10. All `draft`.
- **M5.1 and M5.2 (14 Oct 2026):** plan in `speak-ladder-plan.md`. Ladder regrouped into 11 topic stages with honest labels ("A1 topics"); Review merges cards with the same cue; 13 new A1 scenarios (numbers, introduce, feel, time, when, free, price, near, home, weekend, weather, have, in-class) in all four languages, drafted by four parallel agents from shared blueprints. 23 scenarios × 4 languages, all `draft`. M5.3 the same day: 20 A2 scenarios in all four languages, so 43 scenarios × 4 = 172 realizations, all `draft`.
- **Progression research (12 Oct 2026):** `_project/sites/speak-progression.md`. Nine scenarios are about a fifth of an honest A1–A2 ladder. To decide later, after M4.
- Prash to review the Hindi script views (print → PDF), send corrections, and declare each scenario verified (spec §4.4).
- Hindi romanization is Prash's ASCII scheme (spec §3.3). All Hindi content follows it.
- Milestones M2 to M4 in the spec.
- Local testing: `python -m http.server` in the repo root, then open http://localhost:8000/speak/ and http://localhost:8000/_build/test_speech.html. The app loads JSON, so it does not run from file://.
- **14 Oct 2026, end of sprint:** stage labels fit; review pack by stage; checker recycling report (17–23 of about 280 core chunks per language come back 3+ times). Building paused for review. Next steps in `speak-status.md`.
