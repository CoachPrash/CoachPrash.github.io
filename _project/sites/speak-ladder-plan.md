# Speak: M5 ladder plan

**Status:** agreed 14 October 2026. Prash asked for a quick pace: Claude takes the recommended options and builds. Prash and native reviewers check content in parallel.
**Source:** `speak-progression.md` (research, 12 October 2026). The spec (`speak-spec.md`) stays the contract. This file is the plan behind it.

## 1. Decisions

| # | Decision | Why |
|---|---|---|
| 1 | **Stages become topic groups**, each holding several scenarios: 5 for A1 and 6 for A2, 11 in all | The research's groups. `ladder.json` already allows several scenarios per stage |
| 2 | **Honest labels.** The ladder shows "practises A1 topics", never "A1". Stage 1 reads "Pre-A1 → A1". One line on each ladder says what a level means | Speak trains one strand, scripted speaking |
| 3 | **Keep all ten existing scenarios and their ids.** They move into the new groups. Stage 8 (food stall) moves from A2 to A1 | Ids are permanent. French A1 and HSK band 1 put food first |
| 4 | **Build A1 first:** 13 new scenarios in all four languages, as drafts. A2's 13 new scenarios follow | A1 is where the gap hurts most |
| 5 | **No separate review scenarios for now.** The Review flashcards already recombine earlier chunks | Saves 4 scenarios × 4 languages. Revisit after A1 is in class use |
| 6 | **Recycling is designed in.** Each new dialogue reuses at least two chunks from earlier scenarios. Repair and politeness chunks appear in most scenarios | Rule of three returns (research §5.2) |
| 7 | **One answer per card.** In Review, chunks with the same English cue in one language become one card that accepts any of their forms | A cue like "me too" has two right answers in Spanish (igualmente, a mí también) |
| 8 | **Retrieval warm-up** (a new first class step) is deferred | It changes the class steps, so it needs its own spec change |

## 2. The ladder

★ marks the scenarios that already exist. Ids without a prefix, as today.

### A1 (practises A1 topics)

| Stage | Group | Scenarios |
|---|---|---|
| 1 | First contact (Pre-A1 → A1) | greetings ★ · repair ★ · where-from ★ · **numbers** (age and phone number) |
| 2 | People around me | family ★ · **introduce** (this is my friend) · likes ★ · **feel** (hungry, tired, cold) |
| 3 | Time | **time** (what time is it? what day?) · **when** (birthdays, class days) · **free** (are you free tomorrow?) |
| 4 | Getting things | requests ★ · shopping ★ (food stall) · **price** (at the market) · **near** (is there one near here?) |
| 5 | My world | **home** · **weekend** (what you usually do) · **weather** · **have** (do you have a ___?) · **in-class** (classroom requests) |

### A2 (practises A2 topics)

| Stage | Group | Scenarios |
|---|---|---|
| 6 | My days | routine ★ · often · work · transport |
| 7 | Around town | directions ★ · clothes · restaurant · hotel |
| 8 | Plans and invitations | invite · arrange · phone · plans |
| 9 | What happened | opinions ★ · trip · life · festival |
| 10 | People and wellbeing | describe · doctor · advice · offer |
| 11 | Opinions and choices | compare · recommend · problem |

The A2 scenarios not yet built show as "Coming later".

## 3. Build order

| Part | Content | Size |
|---|---|---|
| **M5.1** | Spec 0.12, `ladder.json` regrouped, labels, one-answer-per-card in Review, the short underlines fixed, colour on the single gender form | Code and docs |
| **M5.2** | A1: 13 new blueprints, then 13 realizations in each of Hindi, Spanish, French and Mandarin (52 files) | Content |
| **M5.3** | A2: 13 new scenarios, the same way | Content |

Each part ends with the checker, the matching tests and a browser run, then a commit.

## 4. Writing rules for new scenarios

- 5–7 lines, A and B, as today. One drill slot, usually `set`, with 4 values.
- 5–8 chunks from the dialogue, plus at most one `extra`. 2 free-practice targets.
- Reuse at least two earlier chunks in each dialogue: greetings, thank you, sorry?, and you?, of course.
- Register: formal is the default where the language has it (Mandarin: 你). Lines with "you" get the other register, or `registerNeutral`.
- Gender: wherever the language marks it, give variants (`speaker` / `listener`) or a `choice: "mf"` chunk.
- Culture: one local touch per scenario where it fits naturally (chai, tinto, boulangerie, 包子).
- Numbers above ten: give an `accept` with digits as well, because recognition often returns digits.
