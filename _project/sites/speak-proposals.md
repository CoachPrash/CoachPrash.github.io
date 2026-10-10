# Speak — proposals after M2

**Status:** proposals for Prash's review, 10 October 2026. Not part of the spec. When Prash agrees, the agreed parts go into `speak-spec.md` first, then into code.

Three ideas: gendered voices, images, and language chunking. The short answer for each:

| Idea | Fits the design? | Size | When |
|---|---|---|---|
| Chunking | Yes. Speak is already half chunk-based. The changes are to the content and the class steps, not to the architecture | Medium | Before M3 |
| Gender | Yes. The real value is choosing the right Hindi and French **form**, not only the voice | Small to medium | Before M3, with chunking |
| Images | Yes. Most useful as picture cues in place of English | Medium, mostly drawing | After M3 |

**Order matters.** M3 drafts French and Mandarin stages 1–4. Chunking and gender both change what a realization holds. If they come after M3, every French and Mandarin file gets written twice. So: a new **M2.5, chunks and gender**, then M3.

---

## 1. Language chunking

### What it means for Speak

Michael Lewis's Lexical Approach (*The Lexical Approach*, 1993; *Implementing the Lexical Approach*, 1997) says language is "grammaticalised lexis, not lexicalised grammar". Learners acquire ready-made chunks and use them whole. Grammar is noticed later.

Lewis names four kinds of chunk. Speak's content already holds three of them:

| Kind | Example | In Speak today |
|---|---|---|
| Fixed expression | फिर मिलेंगे, कोई बात नहीं, enchanté | Whole dialogue lines |
| Frame (semi-fixed) | मेरा नाम ___ है, मुझे ___ दीजिए, je m'appelle ___ | Lines with slots. The drill already swaps the slot: a frame drill |
| Collocation | ख़ुशी हुई, बात करना | Inside lines, not called out |
| Single word | पानी, दो, माँ | The vocab lists. **This is the part that works against chunking** |

So chunking is not a redesign. Three things change: the vocab lists become chunk lists, the class steps follow the chunking order (hear, then chunks, then use), and grammar notes move to the end.

### One honest caveat

The research on formulaic language supports teaching chunks. Examples are Wray's work and Boers and Lindstromberg's. The strong claim that grammar emerges by itself is debated. Most learners still gain from a short look at form, after they can use the chunk. Speak does that already through the notes and the profile page. The proposal keeps them and moves them later.

### Content changes

1. **`vocab` items become chunks.** The JSON key stays `vocab`, so schema 1 holds. The UI says "Chunks". New optional fields:
   - `kind`: `fixed`, `frame` or `collocation`
   - `literal`: a word-by-word gloss, shown on demand. Example: मेरा नाम ___ है is literally "my name ___ is". This is how Lewis's "noticing" happens without a grammar lesson.
2. **Content rule: every chunk comes from the dialogue.** The checker finds each chunk in at least one line, using the matcher from M2. No new markup is needed: the app finds where each chunk sits and underlines it in the dialogue.
3. **Single words go only where they are slot values.** For example, family loses "one / two / three / mother" and gains मेरे दो भाई हैं, मेरी माँ का नाम ___ है and मेरे बच्चे नहीं हैं.
4. **Recycling across the ladder.** Later scenarios reuse earlier chunks on purpose: और आप? (stage 2) appears again in stages 3 and 5. The checker reports which chunks recur and where. This is a report, not an error.

### Class-mode steps, before and after

| Today | Proposed | Why |
|---|---|---|
| 1 Goal | 1 Goal | |
| 2 Vocabulary | 2 **Hear it**: the native speaker performs the whole dialogue. Learners only listen | Input before analysis |
| 3 Model dialogue | 3 **Chunks**: each chunk underlined in its line, then said whole | Noticing |
| — | 4 **Echo**: each chunk repeated 3 times. Long chunks are built from the end: है → क्या है → नाम क्या है → आपका नाम क्या है | Backchaining keeps the natural rhythm. Classic chunk drilling |
| 4 Role play | 5 Role play | |
| 5 Drill | 6 Frame drill: the same drill, renamed | It already is one |
| 6 Free practice | 7 Free practice. Coverage already counts the chunks used | Use |
| — | 8 **Notice**: the notes and `literal` glosses, now that the learners own the chunks | Grammar later |

Solo mode follows the same order. Echo works with the M2 matcher as it stands: each repetition is one chunk scored as one line.

### Review across scenarios

A **Review** mode picks chunks from earlier stages at random. It shows the English (or a picture, see §3), and the learner says the chunk. It stores nothing, so it stays inside the spec's no-tracking rule.

A spaced-repetition list (chunks due today) would need stored progress. That is trigger 2 in "When to move to a server". **Recommendation:** stateless review now, and decide on stored progress later.

---

## 2. Gender

### Text first, voice second

Hindi verbs agree with the speaker (मैं करता हूँ / करती हूँ) and with the listener (आप क्या करते / करती हैं?). French: enchanté / enchantée. Today the content shows both forms as variants with free-text labels ("said by a woman"). If Speak knows each person's gender, it can:

- show the right form in each role-play line
- in solo, accept both forms but flag the other one, like the wrong-register check: "That was the form a woman uses"
- pick a matching voice for the partner

### Changes

| Area | Change |
|---|---|
| Content | Each variant gets structured fields: `speaker: "f" \| "m"` and/or `listener: "f" \| "m"`. The label stays for display. The checker requires them on gendered variants |
| `partnerValues` | `name` gains `gender`. Example: आशा → `f` |
| Class roster | Optional gender per name: f, m or blank. **Blank shows both forms, as today.** The app never guesses gender from a name |
| Solo | One optional setting: "I am: a woman · a man · not set" |
| Storage | `sp.v1.roster` adds gender. `sp.v1.settings` adds the learner's own. Both stay on the device only |

### Voices

The Web Speech API reports no gender for a voice. So:

1. **A small table of known voices.** For Hindi, for example: Microsoft Swara (f) and Madhur (m), the older Kalpana (f) and Hemant (m), and Google हिन्दी (f). The names need checking on real devices. Similar tables for French and Mandarin.
2. **Two voice pickers per language** in the toolbar: "Women's lines" and "Men's lines", filled from that table. Stored as `sp.v1.voice.<lang>.f` and `.m`.
3. **Fallback:** when only one voice exists, a lower pitch for the other gender. It sounds artificial but tells the speakers apart. The spec will say so.

Chrome on Windows offers the Microsoft voices installed on the system, plus Google's. Many systems have only a female Hindi voice. The voice part therefore depends on the device. The text part works everywhere.

---

## 3. Images

### Where pictures teach, not decorate

1. **Picture cues.** In the drill and in review, a picture of water is the cue, not the English "some water". This removes the translation step and suits chunking: the learner goes from the thing to the chunk. **This is the main reason to add images.**
2. **Scene per scenario.** One illustration on the goal step: a tea stall, a family photo, a station. It sets the context.
3. **Speaker avatars** for A and B in role play and solo. These tie in with gender.

### Format and source

- **SVG**, in `speak/img/`, referenced by relative path. The files are small, sharp on a projector, and need no library. They will still work in five years.
- **Schema:**
  - blueprint `scene` and vocab `img`, because a picture is the same in every language
  - `img` on each `slotValues` entry, with the files shared by item: `img/items/water.svg`
- **Who draws:**
  - I can draw clean, flat SVG objects and simple scenes in one consistent palette. Icons for water, tea, a pen or a family tree come out well.
  - Lively character scenes come out stiff. For those, the options are images you generate or commission (WebP, at most 80 KB each), or a licensed set:
    - OpenMoji is CC BY-SA. It needs attribution, and changed images must be shared alike.
    - Twemoji is CC BY. It needs attribution.
- **Not emoji in the text.** Emoji look different on each system and can look childish for older learners.
- **Recommendation:**
  - I draw the item icons and avatars as SVG.
  - We decide on scene art after seeing a sample.
  - A "Picture cues" toggle sits beside "Cue only".

---

## Proposed milestones

| | Scope | Done when |
|---|---|---|
| **M2.5** | Chunks: `kind`, `literal`, the from-the-dialogue checker rule, the new class and solo steps, Hindi stages 1–4 vocab rewritten as chunks. Gender: variant fields, roster and solo gender, voice table and pickers | Prash runs a Hindi class with the new steps. Gendered lines show the right form for named people. Checker passes |
| **M3** | French and Mandarin stages 1–4, drafted chunk-first, with gender fields | As before |
| **M3.5** | Images: item icons, avatars, picture cues; one sample scene | Drill runs on picture cues |
| **M4** | Stages 5–9, plus stateless Review mode | As before, plus review draws from all stages |

## Decisions for Prash

1. Is M2.5 before M3 right? That is my recommendation.
2. Keep the JSON key `vocab` and call it "Chunks" in the UI, or rename the key (schema 2)? I recommend keeping it.
3. Gender options: f, m, or blank (shows both). Agreed?
4. Images: should I draw SVG icons and avatars, and who makes the scene art?
5. Review: stateless now, with stored spaced repetition deferred?
6. Move the notes to a final "Notice" step? Or keep them visible during practice too?
