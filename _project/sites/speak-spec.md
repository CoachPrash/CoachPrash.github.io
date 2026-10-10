# Speak — specification

**Status:** M1 built (4 October 2026). M2 built (9 October 2026), waiting for Prash's spoken test in Chrome (§8).
**Version:** 0.7.2, 9 October 2026
**Brief:** `_project/sites/speak.md`

This file is the build contract. When the spec and the code disagree, the spec wins, or the spec is changed first.

### Changes

**0.7.2** (solo mode built)

- §4.3: after the partner's line plays, the run moves on by itself. Each learner turn keeps its best result for the end summary.

**0.7.1** (found while building the M2 matcher)

- **`accept` entries may be objects** `{ "text", "rom" }` (§3.4). A plain string has no romanization, so typed romanization could never match it. Hindi accepts now carry `rom`.
- **A choice inside a phrase** (§5.3): `रहता / रहती` means either word.
- **Checker:** the known `normalize` rules also include `accents`, `apostrophes` and `han-punctuation`, which the French and Mandarin profiles already use. Accept objects need `text`, and `rom` when the profile has romanization.
- **Files:** `content.js` reads `window.SPEAK_CONTENT_BASE` when set, so the test page can load the real content.

**0.7** (decisions for M2, found while reading the M1 code against §5)

- **Partner values.** New realization field `partnerValues` (§3.4, §3.8): a sample value for each `personal` slot. Text-to-speech uses it, so the partner says "मेरा नाम आशा है", not "मेरा नाम है". Class mode's Play uses it too, when a slot has no name.
- **Slots match 1–3 words** (§5.2). One word was too narrow: recognition writes some values in two words (एक पेन), or writes a loanword in Latin script (teacher). A `set` slot is matched as a wildcard too, so the solo drill checks the sentence, not the item word. The drill screen says so.
- **Normalising** (§5.2): hyphens become spaces in every language, not only French. New Hindi fold `ye-e`: ये and यी inside a word become ए and ई (दीजिये = दीजिए). "Remove the slot text" deleted: it contradicted the slot rule.
- **Scoring defined exactly** (§5.2 step 3): costs, character similarity, and how slots count.
- **Solo details** (§4.3): which `set` value a run uses, how a `personal`-slot drill runs alone, and what "both" means.
- **Files** (§7): `speak/assets/solo.js` holds the solo screen. `_build/test_speech.html` runs the matching cases in the browser.
- **Content fix needed for the M2 test:** a free-practice phrase said without its last word scored 75%, below the 80% bar. So "main Theek hoon" did not tick "मैं ठीक हूँ, शुक्रिया". The short form goes in `accept` in all three languages.

**0.6.1** (no change to behaviour)

- Status line brought up to date: M1 is built.
- §4.5 lists the "cue only" setting, which M1 already stores in `sp.v1.settings`.

**0.6**

- Moved from iPrash/iprash.github.io (commit 555c9fb) to CoachPrash/CoachPrash.github.io. Live at https://coachprash.github.io/speak/. No content or code changed beyond the footer link.
- No `_site.json` and no landing card: the repo root page links to Speak. The whole site stays noindexed until listing.

**0.5** (found while building M1)

- `ladder.json` lists the languages (`"languages": ["hi", "fr", "zh"]`), so a new language needs no code change. The checker compares it with the language folders.
- A ladder stage may have an empty `scenarios` list. The ladder shows it as "Coming later".
- Content loading lives in `assets/content.js`, separate from the screens.
- A site bar on every page, and breadcrumbs with mode links on scenario pages (§4.0).
- The profile page shows a letter chart: `romanization.chart` (§3.3). The Hindi chart covers every letter in traditional order, plus vowel signs. ऑ is added as **o**.

**0.4**

- **Solo free practice is scored** by phrase coverage: how many of the scenario's target phrases the learner used (§5.3). New fields: blueprint `free.targets`, realization `free`.

**0.3**

- **Hindi romanization:** replaced ISO 15919 with Prash's ASCII scheme (§3.3).
- **Solo free practice:** gets a transcript-only Speak button (§4.3). Replaced in 0.4 by coverage scoring.
- **Open questions:** none left.

**0.2**

- **Hindi romanization:** ISO 15919, pronunciation-based. Superseded in 0.3.
- **Register switch:** per scenario, covering 3 levels in Hindi and 2 in French and Mandarin (§3.4, §4.6). New fields: `registers`, `defaultRegister`, `byRegister`, `registerNotes`, `addressesYou`, `registerNeutral`.
- **No timers:** `free.minutes` removed.
- **Confirmed:** one scenario per stage. The native speaker corrects, and takes a role only to partner a learner left without one. Script view is print and PDF only.

---

## 1. Purpose

Speak gives beginners speaking practice through short, progressive, scripted scenarios.

- **Preferred setting:** a group with a native speaker present. The native speaker models the lines, runs the drills and corrects the learners live.
- **Fallback:** one learner alone. The browser speaks the partner's lines and checks what the learner says.

First languages: **Hindi** (Prash teaches it), **French** and **Mandarin Chinese** (Prash is learning them).

### Users

| User | Device | What they do |
|---|---|---|
| Facilitator (usually the native speaker) | One shared screen: a projector, or a Zoom screen share | Picks the scenario and register, enters names, advances the steps, corrects by voice |
| Learner in class | None needed | Reads from the shared screen and speaks |
| Solo learner | Own phone or laptop | Runs a scenario against the browser |
| Reviewer (native speaker) | Paper or PDF | Checks the drafted text in the printable script view |

---

## 2. Decisions

| Topic | Decision |
|---|---|
| Hosting | GitHub Pages, static. Folder `speak/` in the CoachPrash/CoachPrash.github.io repo, served at https://coachprash.github.io/speak/ |
| Engine | Scripted dialogues. No AI partner |
| Speech | Browser Web Speech API. Text-to-speech only, no recordings |
| Tracking | None. Solo mode shows scores during a run. Nothing is kept afterwards, and class mode shows no scores |
| Stored on device | Facilitator roster (names), display settings, last register per language |
| Content authoring | Claude drafts. Prash verifies Hindi. Native speakers review French and Mandarin from the script view. Prash or Claude edit the files |
| Content format | JSON files under `speak/content/`, validated by `_build/check_speak.py` (standard library only) |
| Scenarios per stage | One for now. The schema allows more |
| Native speaker in class | Corrects. Takes a role only to partner a learner left without one |
| Romanization | Hindi: Prash's ASCII scheme, easy to type (§3.3). Mandarin: Hanyu Pinyin with tone marks. French: none |
| Register | Switch per scenario. Hindi आप / तुम / तू, French vous / tu, Mandarin 您 / 你 |
| Timers | None anywhere |
| Reviewer output | Print view. PDF through the browser's Print → Save as PDF |
| UI language | English |
| Visibility | Linked from the coachprash.github.io root page. `noindex` on Speak and the root page until French and Mandarin stages 1–4 are verified |
| Dependencies | None. No framework, no bundler, no PDF library |

### When to move to a server (Railway)

Static hosting stays correct until one of these becomes a requirement. If one does, Speak becomes a separate Railway app, and `speak/content/` moves across unchanged.

1. Learners' devices must follow the facilitator's screen live.
2. Learner progress must persist across sessions or devices.
3. Non-technical people must edit content through a web form.
4. Native-speaker audio must be uploaded from the app.
5. An AI conversation partner is wanted.

---

## 3. Content model

Three kinds of file. A shared **blueprint** defines a scenario once, in English. A **realization** gives that scenario in one language. A **profile** describes the language once.

```
speak/content/
  ladder.json                 order of scenarios
  scenarios/<id>.json         blueprints (English, language-neutral)
  <lang>/profile.json         one per language
  <lang>/<id>.json            realizations (one per scenario per language)
```

Language codes: `hi`, `fr`, `zh`. Scenario ids: lowercase, hyphenated, permanent. **Ids are load-bearing:** they appear in URLs (`#hi/greetings`) and in the checker. Do not rename one after it ships.

Every file carries `"schema": 1`. A change that breaks old files increments it.

### 3.1 `ladder.json`

```json
{
  "schema": 1,
  "languages": ["hi", "fr", "zh"],
  "stages": [
    { "stage": 1, "level": "A1", "title": "Greetings & self-introduction", "scenarios": ["greetings"] },
    { "stage": 2, "level": "A1", "title": "Personal info", "scenarios": ["where-from"] },
    { "stage": 3, "level": "A1", "title": "Numbers & family", "scenarios": ["family"] },
    { "stage": 4, "level": "A1", "title": "Politeness & requests", "scenarios": ["requests"] },
    { "stage": 5, "level": "A1", "title": "Likes & dislikes", "scenarios": ["likes"] },
    { "stage": 6, "level": "A2", "title": "Daily routine", "scenarios": ["routine"] },
    { "stage": 7, "level": "A2", "title": "Shopping & ordering", "scenarios": ["shopping"] },
    { "stage": 8, "level": "A2", "title": "Directions", "scenarios": ["directions"] },
    { "stage": 9, "level": "A2", "title": "Small talk & opinions", "scenarios": ["opinions"] }
  ]
}
```

`languages` lists the language folders in display order. A stage holds a list of scenarios, so a second scenario can be added later without renumbering. An empty list shows as "Coming later". A language-only scenario (§3.5) is listed in a stage like any other.

### 3.2 Blueprint: `scenarios/<id>.json`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema` | 1 | yes | |
| `id` | string | yes | Matches the file name |
| `title` | string | yes | English title |
| `goal` | string | yes | One sentence. What the learner can do after this scenario |
| `roles` | object | yes | `{ "A": "...", "B": "..." }`. Short description of each role |
| `slots` | object | no | Named gaps in lines. See below |
| `lines` | array | yes | The model dialogue, in order. 4 to 8 lines |
| `lines[].id` | string | yes | Unique in the file. `l1`, `l2`, … |
| `lines[].role` | `"A"` or `"B"` | yes | Who says it |
| `lines[].en` | string | yes | English text. Slots written as `{name}` |
| `lines[].addressesYou` | boolean | no | True when the English speaks to the other person ("you", "your", a command). Each language must then say how it handles every register (§3.4) |
| `vocab` | array | yes | 5 to 10 items: `{ "id": "...", "en": "...", "addressesYou": bool }` |
| `drill` | object | yes | `{ "slot": "<slot name>", "instruction": "..." }` |
| `free` | object | yes | `{ "prompt": "...", "targets": [ { "id", "en", "addressesYou" } ] }`. No time limit. `targets` are the new phrases the prompt asks for. They are optional, and scored with the vocabulary in solo mode (§5.3) |

**Slots.** Each slot has a `kind`:

- `personal` — the speaker uses their own detail (a name, a home city). Any value is accepted. In class mode, the drill fills a `name` slot with participants' names.
- `set` — values come from the realization's `slotValues` list. The drill steps through them.

Each slot has a `cue`: the English shown when the learner must supply it ("your name", "an item").

### 3.3 Language profile: `<lang>/profile.json`

| Field | Type | Meaning |
|---|---|---|
| `schema` | 1 | |
| `code` | string | `hi`, `fr`, `zh` |
| `name`, `native` | string | `"Hindi"`, `"हिन्दी"` |
| `locale` | string | BCP 47 tag for speech: `hi-IN`, `fr-FR`, `zh-CN` |
| `script` | string | `Devanagari`, `Latin`, `Han (simplified)` |
| `romanization` | object or null | `{ "name": "...", "show": true, "rules": ["..."], "chart": [...] }`. Null for French. `chart` is optional: groups of `{ "title", "en", "wide", "letters": [["क", "ka"], …], "note" }`, shown on the profile page in order. `wide: true` gives a group the full width |
| `match` | `"words"` or `"chars"` | How answers are compared (§5.2) |
| `normalize` | array | Extra rules for this language (§5.2) |
| `numerals` | object | Maps digits to number words, so "2" and "दो" match. Keys `"0"`–`"10"` |
| `registers` | array | The levels of "you", most formal first: `{ "id", "label", "en" }` |
| `defaultRegister` | string | The register that the base `text` of every line is written in |
| `profile` | object | The adaptation checklist, answered once: `formality`, `script`, `questionWords`, `agreement`, `conjugation`, `wordOrder` |

Register ids are shared across languages: `formal`, `familiar`, `intimate`. A language uses the ones it has.

| Language | `registers` | `defaultRegister` |
|---|---|---|
| Hindi | formal आप · familiar तुम · intimate तू | formal |
| French | formal vous · familiar tu | formal |
| Mandarin | formal 您 · familiar 你 | familiar. 你 is the everyday form. 您 is respectful address |

#### Hindi romanization: plain ASCII, easy to type

Every character is on an English keyboard. Long vowels are doubled, and capitals mark retroflex and other special letters. The scheme is close in spirit to ITRANS, the long-standing ASCII scheme for Indic scripts.

**Vowels** (the same for an independent vowel and for a vowel sign after a consonant):

| | | | | | |
|---|---|---|---|---|---|
| अ a | आ aa | इ i | ई ee | उ u | ऊ oo |
| ऋ ri | ए e | ऐ ai | ओ o | औ au | ऑ o |

**Consonants:**

| Group | Letters |
|---|---|
| Velar | क ka · ख kha · ग ga · घ gha · ङ nga |
| Palatal | च cha · छ chha · ज ja · झ jha · ञ nya |
| Retroflex (capitals) | ट Ta · ठ Tha · ड Da · ढ Dha · ण Na |
| Dental (lowercase) | त ta · थ tha · द da · ध dha · न na |
| Labial | प pa · फ pha · ब ba · भ bha · म ma |
| Semivowels, sibilants | य ya · र ra · ल la · व va · श sha · ष SHa · स sa · ह ha |
| Conjuncts | क्ष ksha · त्र tra · ज्ञ gya |
| Nukta, flaps | क़ q · ख़ Kh · ग़ Gh · ज़ za · फ़ fa · ड़ Ra · ढ़ Rha |

**Rules:**

1. **Write what is pronounced.** The tables name letters with their inherent "a" (ka). In words, a silent inherent vowel is not written:
   - नाम → naam, not naama
   - मिलकर → milkar
   - क्या → kyaa
2. **Capitals carry meaning:** T, D, N, R, SH, Kh, Gh. Nothing else is capitalised: no capital at the start of a sentence, and none for proper nouns inside the Hindi. A slot value such as a learner's name is written as given.
3. **Long ā is always aa,** at the end of a word too: मेरा → meraa, क्या → kyaa.
4. **Anusvara before a consonant** is written n, or m before प फ ब भ म. Examples: मिलेंगे → milenge, हिंदी → hindee, संबंध → sambandh.
5. **A nasal vowel** (ँ, or ं after a vowel) adds n. Examples: हूँ → hoon, मैं → main, नहीं → naheen, हैं → hain.
6. **Visarga** (अः) is h.
7. **फ and फ़ stay distinct.** फ is aspirated p (pha: फिर → phir). फ़ is f (fa: फ़ोन → fon).
8. **ऑ (ॉ), the open o of English loanwords, is o**, like ओ: डॉक्टर → DokTar, कॉफ़ी → kofee.
9. **Chandrabindu (अँ) and anusvara (अं) are both written an** when they stand for a nasal vowel.

The Hindi profile page shows the full chart in this order: vowels, nasals and visarga, vowel signs on क, the five consonant groups (क च ट त प), semivowels, sibilants, conjuncts, and the nukta letters.

Typed answers in solo mode are matched leniently (§5.2), so `mera nam kya hai` matches `meraa naam kyaa hai`.

Example, `hi/profile.json`:

```json
{
  "schema": 1,
  "code": "hi",
  "name": "Hindi",
  "native": "हिन्दी",
  "locale": "hi-IN",
  "script": "Devanagari",
  "romanization": {
    "name": "Speak ASCII (easy to type)",
    "show": true,
    "rules": [
      "Long vowels doubled: aa, ee, oo.",
      "Capitals mark retroflex and special letters: T, D, N, R, SH, Kh, Gh. Nothing else is capitalised.",
      "Silent inherent vowels are not written: naam, milkar.",
      "Long aa is written at the end of a word too: meraa, kyaa.",
      "Anusvara before a consonant: n, or m before p, ph, b, bh, m.",
      "A nasal vowel adds n: hoon, main, naheen.",
      "pha for फ, fa for फ़."
    ]
  },
  "match": "words",
  "normalize": ["nukta", "chandrabindu", "ye-e", "devanagari-digits"],
  "numerals": { "0": "शून्य", "1": "एक", "2": "दो", "3": "तीन", "4": "चार", "5": "पाँच", "6": "छह", "7": "सात", "8": "आठ", "9": "नौ", "10": "दस" },
  "registers": [
    { "id": "formal", "label": "आप", "en": "formal" },
    { "id": "familiar", "label": "तुम", "en": "familiar" },
    { "id": "intimate", "label": "तू", "en": "intimate" }
  ],
  "defaultRegister": "formal",
  "profile": {
    "formality": "Three levels of you: आप (formal), तुम (familiar), तू (intimate). Teach आप first.",
    "script": "Devanagari. Retroflex and aspirated consonants need attention: ट/त, ड/द, क/ख.",
    "questionWords": "क्या, कहाँ, कब, कौन, क्यों, कैसे",
    "agreement": "Verbs and adjectives agree with the gender of the subject: मैं जाता हूँ / मैं जाती हूँ.",
    "conjugation": "Verb endings change with person, gender, number and register: आप हैं, तुम हो, तू है.",
    "wordOrder": "Subject–object–verb. The verb comes last."
  }
}
```

### 3.4 Realization: `<lang>/<id>.json`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `schema` | 1 | yes | |
| `scenario` | string | yes | Blueprint id, or own id for a language-only scenario |
| `lang` | string | yes | Language code |
| `review` | object | yes | `{ "status": "draft" \| "verified", "by": "...", "date": "YYYY-MM-DD" }` |
| `registers` | array | yes | Register ids that fit this scenario. Must include the profile's `defaultRegister` |
| `registerNotes` | object | if a profile register is left out | Why that register does not fit, keyed by register id. Shown on the greyed-out button |
| `lines` | object | yes | Keyed by blueprint line id. Every blueprint line must appear |
| `lines.<id>.text` | string | yes | Target script, in the default register. Slots as `{name}`. A slot may move to fit the language's word order |
| `lines.<id>.rom` | string | if profile has romanization | Romanized form, same slots |
| `lines.<id>.variants` | array | no | Labelled alternatives, each a correct model: `{ "label": "said by a woman", "text": "...", "rom": "..." }`. The UI shows all of them |
| `lines.<id>.accept` | array | no | Extra forms accepted in solo mode. Not shown as models. Each is a string, or `{ "text", "rom" }` so that typed romanization can match it too. With romanization in the profile, use the object |
| `lines.<id>.note` | string | no | A point of usage for this line |
| `lines.<id>.byRegister` | object | see rule | Keyed by register id. Each value may hold `text`, `rom`, `variants`, `accept`, `note`, and overrides those fields for that register |
| `lines.<id>.registerNeutral` | `true` | see rule | Says the line is the same in every register, even though the English addresses "you" |
| `vocab` | object | yes | Keyed by blueprint vocab id: `{ "text", "rom", "byRegister", "registerNeutral" }`. The same register rule applies as for lines |
| `slotValues` | object | if a `set` slot exists | `{ "<slot>": [ { "en": "water", "text": "पानी", "rom": "paanee" } ] }` |
| `partnerValues` | object | if a `personal` slot exists | `{ "<slot>": { "en", "text", "rom" } }`. One sample value per personal slot, used by text-to-speech (§3.8) |
| `free` | object | if the blueprint has `free.targets` | `{ "targets": { "<id>": { "text", "rom", "accept", "byRegister", "registerNeutral" } } }`. Same register rule as lines |
| `notes` | array | no | Points about the whole scenario in this language. Replaces the framework's "adapt note" |

**Register rule.** For every line or vocab item whose blueprint says `addressesYou: true`, the realization must do one of these:

- give `byRegister` entries for every allowed register other than the default, or
- set `registerNeutral: true`.

Any line may carry `byRegister`, even when the English does not address "you". French `Salut !` in place of `Bonjour !` is an example.

**Variants or accept?** A variant is something the learner must choose between, such as a man's form and a woman's form. Accept is just tolerance for another correct way of saying the same thing.

**Resolving a line for display.** Start from `text`, `rom`, `variants`, `accept` and `note`. If the selected register is not the default and `byRegister[register]` exists, its fields replace those fields. Fields it does not set are kept.

### 3.5 Language-only scenarios

A realization whose `scenario` id has no blueprint carries its own `title`, `goal`, `roles`, `lines` (as an array with `id`, `role`, `en`, `addressesYou`, `text`, `rom`), `vocab`, `drill` and `free`. Example uses: a chai stall in Hindi, a tone-pair drill in Mandarin. The checker accepts either shape.

### 3.6 Worked example: stage 1, `greetings`, in all three languages

This example is normative. Together with the profile example in §3.3, each field in §3.2 to §3.4 appears at least once. The exceptions are `set` slots and `slotValues`, which appear in §3.7.

**`scenarios/greetings.json`**

```json
{
  "schema": 1,
  "id": "greetings",
  "title": "Greetings & self-introduction",
  "goal": "Greet someone, give your name and ask theirs.",
  "roles": { "A": "Starts the conversation", "B": "Answers" },
  "slots": { "name": { "kind": "personal", "cue": "your name" } },
  "lines": [
    { "id": "l1", "role": "A", "en": "Hello!" },
    { "id": "l2", "role": "B", "en": "Hello!" },
    { "id": "l3", "role": "A", "en": "My name is {name}. What is your name?", "addressesYou": true },
    { "id": "l4", "role": "B", "en": "My name is {name}. Nice to meet you.", "addressesYou": true },
    { "id": "l5", "role": "A", "en": "Nice to meet you too. Goodbye!", "addressesYou": true }
  ],
  "vocab": [
    { "id": "hello", "en": "hello" },
    { "id": "my-name-is", "en": "my name is ___" },
    { "id": "your-name", "en": "what is your name?", "addressesYou": true },
    { "id": "nice-to-meet", "en": "nice to meet you", "addressesYou": true },
    { "id": "me-too", "en": "me too" },
    { "id": "goodbye", "en": "goodbye" }
  ],
  "drill": { "slot": "name", "instruction": "Go round the group. Swap only the name." },
  "free": {
    "prompt": "Add \"How are you?\" and \"I am fine, thank you.\"",
    "targets": [
      { "id": "how-are-you", "en": "how are you?", "addressesYou": true },
      { "id": "i-am-fine", "en": "I am fine, thank you." }
    ]
  }
}
```

**`hi/greetings.json`**: two registers. तू is ruled out, with a reason.

```json
{
  "schema": 1,
  "scenario": "greetings",
  "lang": "hi",
  "review": { "status": "draft", "by": null, "date": null },
  "registers": ["formal", "familiar"],
  "registerNotes": { "intimate": "तू is for very close family and friends: people you would never need to introduce yourself to. With a stranger it is rude." },
  "lines": {
    "l1": { "text": "नमस्ते!", "rom": "namaste!", "accept": ["नमस्कार"] },
    "l2": { "text": "नमस्ते!", "rom": "namaste!" },
    "l3": {
      "text": "मेरा नाम {name} है। आपका नाम क्या है?",
      "rom": "meraa naam {name} hai. aapkaa naam kyaa hai?",
      "note": "आपका: your, formal. Use it with anyone older than you or anyone you have just met.",
      "byRegister": {
        "familiar": {
          "text": "मेरा नाम {name} है। तुम्हारा नाम क्या है?",
          "rom": "meraa naam {name} hai. tumhaaraa naam kyaa hai?",
          "note": "तुम्हारा: your, familiar. For friends, classmates and children."
        }
      }
    },
    "l4": {
      "text": "मेरा नाम {name} है। आपसे मिलकर ख़ुशी हुई।",
      "rom": "meraa naam {name} hai. aapse milkar Khushee huee.",
      "byRegister": {
        "familiar": { "text": "मेरा नाम {name} है। तुमसे मिलकर ख़ुशी हुई।", "rom": "meraa naam {name} hai. tumse milkar Khushee huee." }
      }
    },
    "l5": {
      "text": "मुझे भी। फिर मिलेंगे!",
      "rom": "mujhe bhee. phir milenge!",
      "registerNeutral": true,
      "note": "फिर मिलेंगे (\"we'll meet again\") is the everyday goodbye. अलविदा sounds final and is rare in speech."
    }
  },
  "vocab": {
    "hello": { "text": "नमस्ते", "rom": "namaste" },
    "my-name-is": { "text": "मेरा नाम ___ है", "rom": "meraa naam ___ hai" },
    "your-name": { "text": "आपका नाम क्या है?", "rom": "aapkaa naam kyaa hai?", "byRegister": { "familiar": { "text": "तुम्हारा नाम क्या है?", "rom": "tumhaaraa naam kyaa hai?" } } },
    "nice-to-meet": { "text": "आपसे मिलकर ख़ुशी हुई", "rom": "aapse milkar Khushee huee", "byRegister": { "familiar": { "text": "तुमसे मिलकर ख़ुशी हुई", "rom": "tumse milkar Khushee huee" } } },
    "me-too": { "text": "मुझे भी", "rom": "mujhe bhee" },
    "goodbye": { "text": "फिर मिलेंगे", "rom": "phir milenge" }
  },
  "free": {
    "targets": {
      "how-are-you": { "text": "आप कैसे हैं?", "rom": "aap kaise hain?", "byRegister": { "familiar": { "text": "तुम कैसे हो?", "rom": "tum kaise ho?" } } },
      "i-am-fine": { "text": "मैं ठीक हूँ, शुक्रिया।", "rom": "main Theek hoon, shukriyaa.", "accept": ["मैं ठीक हूँ, धन्यवाद।"] }
    }
  },
  "notes": ["The verb comes last: मेरा नाम Prash है is literally \"my name Prash is\"."]
}
```

**`fr/greetings.json`**: both registers. The greeting itself also changes register.

```json
{
  "schema": 1,
  "scenario": "greetings",
  "lang": "fr",
  "review": { "status": "draft", "by": null, "date": null },
  "registers": ["formal", "familiar"],
  "lines": {
    "l1": { "text": "Bonjour !", "byRegister": { "familiar": { "text": "Salut !", "accept": ["Bonjour !"] } } },
    "l2": { "text": "Bonjour !", "byRegister": { "familiar": { "text": "Salut !", "accept": ["Bonjour !"] } } },
    "l3": {
      "text": "Je m'appelle {name}. Comment vous appelez-vous ?",
      "accept": ["Je m'appelle {name}. Et vous ?"],
      "byRegister": { "familiar": { "text": "Je m'appelle {name}. Comment tu t'appelles ?", "accept": ["Je m'appelle {name}. Et toi ?"] } }
    },
    "l4": {
      "text": "Je m'appelle {name}. Enchanté.",
      "registerNeutral": true,
      "variants": [
        { "label": "said by a man", "text": "Je m'appelle {name}. Enchanté." },
        { "label": "said by a woman", "text": "Je m'appelle {name}. Enchantée." }
      ]
    },
    "l5": { "text": "Moi aussi. Au revoir !", "registerNeutral": true }
  },
  "vocab": {
    "hello": { "text": "bonjour" },
    "my-name-is": { "text": "je m'appelle ___" },
    "your-name": { "text": "comment vous appelez-vous ?", "byRegister": { "familiar": { "text": "comment tu t'appelles ?" } } },
    "nice-to-meet": { "text": "enchanté / enchantée", "registerNeutral": true },
    "me-too": { "text": "moi aussi" },
    "goodbye": { "text": "au revoir" }
  },
  "free": {
    "targets": {
      "how-are-you": { "text": "Comment allez-vous ?", "byRegister": { "familiar": { "text": "Comment ça va ?", "accept": ["Ça va ?"] } } },
      "i-am-fine": { "text": "Je vais bien, merci.", "accept": ["Ça va bien, merci.", "Très bien, merci."] }
    }
  },
  "notes": ["Enchanté and enchantée sound the same. The spelling follows the speaker's gender."]
}
```

**`zh/greetings.json`**: the default is familiar (你). The formal register swaps in 您.

```json
{
  "schema": 1,
  "scenario": "greetings",
  "lang": "zh",
  "review": { "status": "draft", "by": null, "date": null },
  "registers": ["formal", "familiar"],
  "lines": {
    "l1": { "text": "你好！", "rom": "Nǐ hǎo!", "byRegister": { "formal": { "text": "您好！", "rom": "Nín hǎo!" } } },
    "l2": { "text": "你好！", "rom": "Nǐ hǎo!", "byRegister": { "formal": { "text": "您好！", "rom": "Nín hǎo!" } } },
    "l3": {
      "text": "我叫{name}。你叫什么名字？",
      "rom": "Wǒ jiào {name}. Nǐ jiào shénme míngzi?",
      "byRegister": { "formal": { "text": "我叫{name}。您叫什么名字？", "rom": "Wǒ jiào {name}. Nín jiào shénme míngzi?", "note": "Even more polite, for a surname only: 您贵姓？ (Nín guì xìng?)." } }
    },
    "l4": {
      "text": "我叫{name}。很高兴认识你。",
      "rom": "Wǒ jiào {name}. Hěn gāoxìng rènshi nǐ.",
      "byRegister": { "formal": { "text": "我叫{name}。很高兴认识您。", "rom": "Wǒ jiào {name}. Hěn gāoxìng rènshi nín." } }
    },
    "l5": {
      "text": "我也很高兴认识你。再见！",
      "rom": "Wǒ yě hěn gāoxìng rènshi nǐ. Zàijiàn!",
      "byRegister": { "formal": { "text": "我也很高兴认识您。再见！", "rom": "Wǒ yě hěn gāoxìng rènshi nín. Zàijiàn!" } }
    }
  },
  "vocab": {
    "hello": { "text": "你好", "rom": "nǐ hǎo" },
    "my-name-is": { "text": "我叫___", "rom": "wǒ jiào ___" },
    "your-name": { "text": "你叫什么名字？", "rom": "nǐ jiào shénme míngzi?", "byRegister": { "formal": { "text": "您叫什么名字？", "rom": "nín jiào shénme míngzi?" } } },
    "nice-to-meet": { "text": "很高兴认识你", "rom": "hěn gāoxìng rènshi nǐ", "byRegister": { "formal": { "text": "很高兴认识您", "rom": "hěn gāoxìng rènshi nín" } } },
    "me-too": { "text": "我也是", "rom": "wǒ yě shì" },
    "goodbye": { "text": "再见", "rom": "zàijiàn" }
  },
  "free": {
    "targets": {
      "how-are-you": { "text": "你好吗？", "rom": "Nǐ hǎo ma?", "accept": ["你最近怎么样？"], "byRegister": { "formal": { "text": "您好吗？", "rom": "Nín hǎo ma?" } } },
      "i-am-fine": { "text": "我很好，谢谢。", "rom": "Wǒ hěn hǎo, xièxie." }
    }
  },
  "notes": ["你好 is two third tones in a row. The first one rises: say ní hǎo."]
}
```

### 3.7 Set slots, in short

Stage 4 (`requests`) uses a `set` slot:

```json
{
  "slots": { "item": { "kind": "set", "cue": "an item" } },
  "lines": [ { "id": "l1", "role": "A", "en": "Excuse me, can I have {item}, please?", "addressesYou": true } ]
}
```

with values in each realization:

```json
{
  "slotValues": { "item": [
    { "en": "some water", "text": "पानी", "rom": "paanee" },
    { "en": "a pen", "text": "एक पेन", "rom": "ek pen" },
    { "en": "some tea", "text": "चाय", "rom": "chaay" }
  ] }
}
```

The drill shows the English cue ("a pen") and the learner says the whole line with the target word in place.

### 3.8 Partner values, in short

A `personal` slot has no fixed value: each speaker uses their own name or city. Text-to-speech still needs something to say. `partnerValues` gives one sample value per personal slot, chosen to suit the language:

```json
{
  "partnerValues": {
    "name": { "en": "Asha", "text": "आशा", "rom": "aashaa" },
    "city": { "en": "Delhi", "text": "दिल्ली", "rom": "dillee" }
  }
}
```

- **Solo mode:** the partner is this person. The partner's lines show and speak these values. The learner's own lines show a blank and the cue ("your name").
- **Everywhere:** when text-to-speech plays a line and a personal slot has no value (no class names entered, or the learner's own line under Hear it), it uses the partner value.

---

## 4. Screens and flows

Routes are hash-based, so they work on GitHub Pages with no server rules:

| Route | Screen |
|---|---|
| `#` | Home: pick a language |
| `#hi` | Ladder for one language |
| `#hi/greetings/class` | Class mode |
| `#hi/greetings/solo` | Solo mode |
| `#hi/greetings/script` | Script view |
| `#hi/profile` | Language profile: the adaptation checklist answered, the levels of "you", the romanization chart and its rules |

### 4.0 Site navigation

- **Site bar, on every page.** It holds the Speak brand (links home), **Home**, one link per language (native name plus English name), and "About <language>" for the current language. The current language is highlighted. The bar is hidden in print.
- **Switching language keeps your place.** Inside a scenario, a language link opens the same scenario and mode in that language, when that language has it. Otherwise it opens that language's ladder.
- **Breadcrumbs:** Home / Language / Scenario. On scenario pages, the trail is followed by mode links: **Class · Solo · Script**, with the current mode highlighted.

### 4.1 Home and ladder

- **Home** shows one card per language: its name in English and in its own script, and how many scenarios are drafted and how many verified.
- **Ladder** lists the stages in order. Each scenario shows its title, goal and review status:
  - **Verified**, with the reviewer's name and date
  - **Draft** (not reviewed)
  - **Not yet in this language**, which is listed but not clickable
- Each available scenario offers three buttons: **Class**, **Solo** and **Script**.

### 4.2 Class mode (shared screen)

**Setup** (once per session, remembered on the device):

1. Enter participant names. One per line.
2. Mark who the native speaker is, if present.

**Pairing rule:**

- **One learner and the native speaker:** run A = learner, B = native. Then run again with the roles swapped.
- **Two or more learners:** pair them in order (1–2, 3–4, …). Each pair runs once, then again with roles swapped. If one learner is left over, they pair with the native speaker.
- **The native speaker never takes a role otherwise.** They listen and correct.
- **Override:** the facilitator can reorder pairs or rerun a pair.

**Steps.** Each step is one screen. The facilitator moves on with Next, the right-arrow key or a presenter clicker, which sends PageDown or arrow keys. Back works the same way in reverse.

1. **Goal.** The goal in large type.
2. **Vocabulary.** One item per screen: target text, romanization, English. Play button (text-to-speech). Show/hide the English.
3. **Model dialogue.** All lines, with the current one highlighted. Play line, or play all. Play fills an empty personal slot from `partnerValues` (§3.8).
4. **Role play.** The current pair's names are shown on the A and B sides. One line at a time. Toggle: show the target text, or show only the English cue. Use the cue only to test.
5. **Drill.** The next slot value's English cue, plus whose turn it is. Rotates through participants.
6. **Free practice.** The prompt, with the target phrases and the scenario's vocabulary below it for reference. No timer, no score: the native speaker listens. **Done** ends the run.

**Display:** text is large enough to read from the back of a room. Minimum target-text size is 40px at 1280px wide. Class mode shows no scores, and nothing is recorded.

### 4.3 Solo mode (own device)

- The learner picks a role (A or B), or "both, one after the other": a run as A, then a run as B.
- **Partner's lines:** shown and played by text-to-speech, with personal slots filled from `partnerValues` (§3.8). When the line ends, the run moves on by itself. Next skips ahead. With no voice for the language, the line is shown and Next moves on.
- **Set slots in the dialogue:** a run uses the first value in `slotValues`. The cue shows it ("Please give me some water").
- **Learner's lines:** the English cue is shown. Then:
  1. The learner taps **Speak**.
  2. Recognition transcribes the speech.
  3. The transcript is matched against the line in the selected register (§5.2).
  4. The result is shown: **Good**, **Nearly** or **Not quite**, with the model and the missed words or characters marked.
- **Other buttons:** Hear it, Show answer, Try again, Skip.
- **Typed fallback:** always available. It also accepts the romanization (§5.2).
- **Drill:** works the same way.
  - A `set` slot: one turn per value in `slotValues`, in order.
  - A `personal` slot: one turn. The learner says the drill lines with their own detail.
  - The slot is a wildcard (§5.2), so the check covers the sentence around the item, not the item word. The drill screen says so in one line.
- **Free practice:** scored by phrase coverage (§5.3). No timer.
  1. The screen shows the prompt and a checklist of phrases to use: the target phrases first, then the vocabulary, in the selected register.
  2. The learner taps **Speak** as many times as they like. Each transcript is shown, and every phrase heard in it gets a tick that stays for the rest of the run.
  3. A running score shows "4 of 8 phrases used". A phrase said in another register gets a warning instead of a tick: "That was the तुम form".
  4. **Done** shows the final coverage and lists the phrases not yet used.
  - Typed input works the same way, for browsers without recognition.
- **End:** a summary of turns said well, plus the free-practice coverage. A turn counts its best attempt. It is not stored.

### 4.4 Script view (for reviewers)

- **Layout:** one printable page per scenario per language. It shows every line in English, then the target text and romanization in **every allowed register, side by side in columns**. Lines that do not vary span all columns. It also shows variants, accepts, notes, register notes, vocabulary and slot values.
- **Review aids:** each line has a checkbox and a blank line for corrections. The header shows the review status and blanks for "Reviewed by" and "Date".
- **Print:** `@media print` removes navigation. The page fits A4 and US Letter. For a PDF, use the browser's Print → Save as PDF.
- **Corrections:** reviewers mark up paper or the PDF. Prash or Claude apply the changes to the JSON and set `review` to `verified`.

### 4.5 Display settings

Applies everywhere, stored per device:

- romanization on/off
- English on/off
- cue only on/off: role play and drill show only the English cue (§4.2)
- speech rate (0.7×, 0.8×, 0.9×, 1×)
- voice choice per language

### 4.6 Register switch

- **Where:** a segmented control at the top of class, solo and script view. It shows the profile's registers with their labels: `आप · तुम · तू`, `vous · tu`, `您 · 你`. The English name shows on hover and in small text beneath.
- **What a tap does:** re-renders the current screen at once, mid-dialogue included. Vocabulary, dialogue, drill and free-practice reference all follow the register.
- **Blocked registers:** a register the realization does not allow is greyed out. Tapping it shows its `registerNotes` text.
- **Changed-line marker:** after a switch, lines whose text changed get a small marker for the rest of that screen, so learners see exactly what formality touches.
- **Memory:** the last choice is stored per language. A new scenario opens in that register if the scenario allows it, and otherwise in the profile's `defaultRegister`. No separate site-wide setting is needed.
- **Script view:** the switch is replaced by the side-by-side columns.

---

## 5. Speech

### 5.1 Browser support, October 2026

| | Chrome / Edge | Safari | Firefox |
|---|---|---|---|
| Text-to-speech | Yes | Yes | Yes |
| Recognition | Yes. Audio is sent to Google or Microsoft to transcribe | Yes | No: typed answers only |

Recognition needs https, which GitHub Pages provides. Voices depend on the operating system. Windows and Chrome both ship Hindi, French and Mandarin voices, and Safari has them on macOS and iOS.

- **No voice installed for a language:** the screen says so and names where to add one.
- **Recognition missing or blocked:** solo mode switches to typed answers and says why.

### 5.2 Matching

1. **Normalise both strings.**
   - **All languages:**
     - lowercase
     - strip punctuation, including `।` (danda) and `、。！？`
     - hyphens become spaces (भाई-बहन = भाई बहन)
   - **French:** remove accents and apostrophes.
   - **Hindi, Devanagari:**
     - fold nukta letters to their base (ज़ → ज, ख़ → ख, फ़ → फ)
     - treat chandrabindu and anusvara as equal (ँ = ं)
     - `ye-e`: य followed by े or ी becomes ए or ई, except at the start of a word or after ् (virama). Both spellings are common: दीजिये = दीजिए, गये = गए, नयी = नई. The word ये ("these") does not change
   - **Hindi, typed romanization:**
     - lowercase, so T and t match
     - collapse doubled vowels (aa → a, ee → i, oo → u)
     - w → v
   - **Mandarin:** recognition returns simplified characters. No further folding.
   - **Digits:** replace them with words from `profile.numerals`. For Hindi, first convert Devanagari digits (०–९) to ASCII (`devanagari-digits`).
2. **Tokenise** by the profile's `match` mode:
   - **words:** split on spaces
   - **chars:** each Han character is one token
3. **Score.** Score = 1 − edit distance ÷ the longer token count, and never below 0.
   - **Edit distance** is counted in tokens. Inserting or deleting a token costs 1. Swapping one token for another costs 1, or 0.3 when the two are similar.
   - **Similar** means a character similarity of 75% or more. Character similarity = 1 − character edit distance ÷ the length of the longer token.
   - **Slots:** a `{slot}` in the model matches a run of 1–3 tokens at no cost, in `words` mode. In `chars` mode it matches 1–4 characters. This holds for `personal` and `set` slots alike.
   - **Longer token count:** the larger of the model's and the transcript's token counts. A slot, and the run it matches, count as one token.
4. **Best match:** compare every recognition alternative (up to 5) against the resolved line for the selected register: its text, every variant and every accept. The best score wins.
5. **Verdict:**
   - **Good:** 80% or more
   - **Nearly:** 55% to 79%
   - **Not quite:** below 55%
6. **Wrong register.** Also score the alternatives against the line in every other allowed register. If another register scores Good and beats the selected one, the verdict is **Nearly**, with "That was the तुम form" (the label of the register the learner used).
7. **Typed input** is also compared against `rom`, with diacritics stripped and the Hindi folds above applied. So `ni hao` matches `Nǐ hǎo`, and `mera nam` matches `meraa naam`.

**Limit, stated in the UI once per session:** recognition shows whether a machine understood the words. It does not judge pronunciation or Mandarin tones. A native speaker does that.

### 5.3 Free-practice scoring (solo mode)

Free practice has no model answer, so it is not scored by distance from one. It is scored by **coverage**: did the learner use, unscripted, the phrases this scenario teaches? That is what the step exists to test.

1. **Phrases to check.** The scenario's `free.targets`, then its vocabulary. Each is resolved in the selected register (§3.4).
   - Each phrase's text, variants and `accept` strings all count.
   - A `___` in a vocabulary entry or target matches like a slot (§5.2 step 3).
   - A ` / ` between two words marks a choice: `मैं ___ में रहता / रहती हूँ` matches either word.
2. **Normalise.** Normalise every transcript, and every phrase, as in §5.2 step 1.
3. **Look for each phrase.** A phrase is used when some run of tokens in a transcript matches it with a score of 80% or more, using the §5.2 scoring.
   - `words` mode: the run is consecutive words.
   - `chars` mode: the run is consecutive characters.
   - All transcripts in the run count together, so the learner can spread phrases over several sentences.
4. **Wrong register.** A phrase that matches only in another allowed register counts as not used. It is flagged with that register's label.
5. **Score.** Phrases used ÷ phrases checked.
   - **Good:** 75% or more
   - **Keep going:** below 75%, with the unused phrases listed

Coverage rewards using the taught material. It says nothing about grammar between the phrases. The UI says so in one line under the score.

---

## 6. Storage

localStorage, prefix `sp.v1.`. Every read and write is wrapped in try/catch, and the app works if storage is empty or blocked.

| Key | Holds |
|---|---|
| `sp.v1.settings` | Display settings (§4.5) |
| `sp.v1.voice.<lang>` | Chosen voice name |
| `sp.v1.register.<lang>` | Last register chosen (§4.6) |
| `sp.v1.roster` | Last class roster: names, and who the native speaker is |

Nothing else. No scores are stored.

---

## 7. Files

| File | Kind | Notes |
|---|---|---|
| `speak/index.html` | hand-written | Shell. Has `noindex` while parked |
| `speak/assets/style.css` | hand-written | System fonts plus Noto Sans Devanagari and Noto Sans SC from Google Fonts, with system fallbacks |
| `speak/assets/content.js` | hand-written | Loads the JSON and resolves lines for a register and slot values. No DOM code. Reads the content folder from `window.SPEAK_CONTENT_BASE` when set (test page only) |
| `speak/assets/app.js` | hand-written | Router and screens. Exposes the shared screen helpers (storage, toolbar, register switch) for `solo.js` |
| `speak/assets/solo.js` | hand-written | Solo mode screen (§4.3) |
| `speak/assets/speech.js` | hand-written | Text-to-speech, recognition, matching (§5). No DOM code, so it can be tested alone |
| `speak/content/**` | hand-written data | §3 |
| `_build/check_speak.py` | tooling | Validator. Standard library only |
| `_build/test_speech.html` | tooling | Runs the matching cases against `speech.js` and lists pass or fail. No dependencies. Open over http: `python -m http.server`, then `/_build/test_speech.html` |
| `_project/sites/speak.md` | brief | |
| `_project/sites/speak-spec.md` | this file | |

### Checker rules (`_build/check_speak.py`)

The checker exits with a non-zero code and one line per problem when any of these fail:

- every file parses and has `schema: 1`
- every ladder id has a blueprint, or a language-only realization
- every realization line id exists in its blueprint, and every blueprint line appears in every realization
- every slot used in `en` appears in `text` and `rom`, including in `byRegister` and `variants`, and nowhere else
- every `set` slot has at least three `slotValues`
- every `personal` slot has a `partnerValues` entry with `en` and `text`, plus `rom` when the profile has romanization. `partnerValues` has no other keys
- every profile `normalize` entry is a known rule: `nukta`, `chandrabindu`, `ye-e`, `devanagari-digits`, `accents`, `apostrophes`, `han-punctuation`
- every `accept` entry is a string or an object with `text`, plus `rom` when the profile has romanization. Its slots follow the slot rule above
- `review.status` is `draft` or `verified`. `verified` needs `by` and `date`
- `rom` is present on every line when the profile has romanization, including inside `byRegister` entries that set `text`
- vocab keys match the blueprint's vocab ids
- **Registers:**
  - `registers` includes the profile's `defaultRegister`, and every id in it exists in the profile
  - every profile register left out of `registers` has a `registerNotes` entry
  - `byRegister` keys are allowed registers other than the default
  - every `addressesYou` line, vocab item and free target has `byRegister` for each allowed non-default register, or `registerNeutral: true`
- every blueprint `free.targets` id appears in the realization's `free.targets`, and no others

It runs on every commit that touches `speak/content/`.

---

## 8. Milestones

Each milestone is shippable on its own, and the card stays parked throughout.

| | Scope | Done when |
|---|---|---|
| **M1** | Schema, checker, profiles for hi/fr/zh, Hindi stages 1–4, class mode with the register switch, script view | Prash runs a Hindi class from a projector using stages 1–4, in both आप and तुम. Checker passes. Script view prints cleanly |
| **M2** | Solo mode: recognition, matching, wrong-register detection, typed fallback | Each Hindi model line from stages 1–4 scores Good when spoken by Prash in Chrome, in its register. Saying the तुम form while आप is selected gives "Nearly — that was the तुम form". Typed romanization matches. In greetings free practice, saying "aap kaise hain" and "main Theek hoon" ticks both target phrases. `_build/test_speech.html` passes |
| **M3** | French and Mandarin, stages 1–4 drafted in all their registers. Script view sent to reviewers | Checker passes. Prash has PDFs to send |
| **M4** | Stages 5–9 in all three languages | Checker passes. Hindi verified by Prash |
| **List** | Open to search engines | French and Mandarin stages 1–4 verified by native speakers. `noindex` removed from `speak/index.html` and the root `index.html` |

---

## 9. Out of scope for v1

Live sync between devices, accounts, stored scores or history, recorded audio, an AI partner, branching dialogues, timers, pinyin rendered above each character (v1 puts it on a separate line), and a UI in any language other than English.

---

## 10. Open questions for Prash

None.
