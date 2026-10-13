# Speak: status, decisions and next steps

**As of:** 14 October 2026, end of the build sprint of 9–14 October.
**Last commit:** `d392024`, pushed. Spec version 0.12.1.
**Read this after `README-FIRST.md`** to know where Speak stands and what comes next.

## 1. What exists today

| Area | State |
|---|---|
| Languages | Hindi (`hi`), Spanish, Colombian (`es`, es-CO), French (`fr`), Mandarin (`zh`), in that order on the site |
| Ladder | 11 topic stages: 5 at A1 (stage 1 is Pre-A1 → A1), 6 at A2. 43 scenarios |
| Content | 43 blueprints and 172 realizations (43 × 4). **All `draft`. Nothing is verified yet** |
| Class mode | 8 steps: Goal, Hear it, Chunks, Echo, Role play, Frame drill, Free practice, Notice. Roster with pairing and genders, register switch, bottom bar with Play and Play all |
| Solo mode | Setup (gender, role), Hear it, Echo, dialogue turns, frame drill (up to 4 random values), free practice scored by coverage, Notice, summary. Speech recognition or typing, romanization accepted |
| Review | Flashcards at `#hi/review`: Flip or Say it, stage picker, 10 cards a run, one answer per card |
| Script view | One scenario per page, printable. **Review pack** at `#hi/script`, by stage at `#hi/script/1-5`, with a reviewer's guide |
| Device check | `#check`: voices per language, test sentence, microphone test |
| Gender | Variants by speaker or listener, `choice: "mf"` chunks. Man's forms blue, woman's light red, with (m)/(f) |
| Tests | `python _build/check_speak.py` prints OK. `node _build/test_speech.js`: 4,062 cases pass |
| Visibility | `noindex` on Speak and the root page until French, Spanish and Mandarin stages 1–4 are verified |

## 2. Decisions, with dates

| Date | Decision |
|---|---|
| 10 Oct | Chunks and gender (M2.5) before French and Mandarin (M3). "Chunk" on the site, never "vocabulary". Gender per person: Male, Female or blank, never guessed from a name. Review stays stateless. Grammar only in the Notice step |
| 11 Oct | Options read Male and Female, in that order. Play buttons in a fixed bottom bar |
| 12 Oct | People (participant profiles) tabled. If it returns: CSV import and export on the device only, never real student data in the public repo |
| 12 Oct | Images (M3.5) deferred until after M4. The source for scenes is still open: AI-generated, Open Peeps (CC0), stock photos, or none |
| 13 Oct | Spanish added as Colombian (es-CO). Usted default, tú second, vos not taught. Switching to Mexican means changing the locale and a few culture words |
| 13 Oct | Stage 2 "When you don't understand" (`repair`) added, because the research found repair to be the main A1 gap |
| 13 Oct | Gender forms colour-coded: blue for the man's form, light red for the woman's, plus (m)/(f) so colour is never the only cue |
| 14 Oct | M5 ladder plan (`speak-ladder-plan.md`), with Claude taking the recommended options: topic stages, honest labels, keep all existing ids, A1 then A2, no separate review scenarios yet, one answer per card, retrieval warm-up deferred |
| 14 Oct | Content is drafted by four parallel agents, one per language, from blueprints Claude writes. Prash and native reviewers check in parallel; review does not block building |
| 14 Oct | Stop building new content until the drafts are reviewed and used in class |
| 14 Oct | B1–B2 is not the next step. Scripted matching suits A1–A2. B1 needs free speech, which needs an AI partner (the Railway trigger). Go deeper first, then decide |

## 3. Known gaps

1. **Nothing is verified.** 172 drafts, most written by agents in one day. Expect errors only a native speaker will catch.
2. **Recycling is weak.** The checker reports how many core chunks come back in 3 or more later scenarios. Only 17–23 of about 280 per language do, and about 230 never come back. Run `python _build/check_speak.py --recycling` for the list.
3. **Drill values are short.** A slot holds 1–3 words, or 1–4 characters in Mandarin. Agents shortened values to fit (phone numbers, "mal à la tête", 中秋快乐). Raising the limit is a small matcher change, if reviewers find it too tight.
4. **Third-person gender** (a friend, a sister) uses labelled variants, not the coloured man/woman forms.
5. **Reviewer flags** that agents raised for each language are in the commit discussion. The main ones:
   - Hindi: "आम कैसे दिए?", "दिलचस्प है, पर थका देता है", "ऑल द बेस्ट", and the romanization of loanwords
   - Spanish: "le colaboro", "vestier", "paradero", "¿aló?", "qué pena con usted"
   - French: "C'est juste ?", "Venez, c'est tout !"
   - Mandarin: 你人来就行, 我请客, 两斤 for a kilo

## 4. Next steps, in order

1. **Review and class use.**
   - Prash reviews Hindi from the review pack, stage by stage, starting with A1 (stages 1–5).
   - Native speakers review Spanish, French and Mandarin the same way.
   - Prash says "Verified: <lang> <scenario>, <name>, <date>". Claude records it and applies the corrections.
2. **Recycling pass, in the same edit as the corrections.**
   - Choose 60–80 high-value core chunks per language: "and you?", "can you repeat that?", "how much is it?", "I'd like…", "of course".
   - Weave each one into at least three later dialogues.
   - Watch the checker's recycling count rise.
3. **Retrieval warm-up.** A new first class step: three minutes recalling earlier chunks before hearing them. It needs a spec change first.
4. **Mix it (sentence constructor).** The bridge from A2 towards B1: learners combine chunks into new sentences. Proposal 3 in `speak-proposals.md`.
5. **Smaller items, as needed:**
   - longer drill slots
   - review scenarios at stage ends
   - images (M3.5)
   - version numbers on script links, if browser caching bites again
6. **Then decide:** either a short B1 "bridge" stage (retell a story, give reasons, handle a complaint), or an AI conversation partner on Railway (spec §2, "When to move to a server").

## 5. How to resume

1. Read `_project/README-FIRST.md`, then this file, then `speak-spec.md`.
2. Run `python _build/check_speak.py` and `node _build/test_speech.js`. Both must pass.
3. Check `git log --oneline -5` against the last commit above.
4. Ask Prash which reviews or class feedback have come in, then take step 1 of section 4.
