/* Speak: speech. No DOM code, so it can be tested alone (_build/test_speech.html).
 *
 *   Text-to-speech     speechSynthesis
 *   Recognition        SpeechRecognition / webkitSpeechRecognition
 *   Matching           spec §5.2: normalise, tokenise, score, verdict, wrong register
 *   Coverage           spec §5.3: free-practice phrases found in a transcript
 *
 * Exposes window.SpeakSpeech.
 */
(function () {
  "use strict";

  /* ================================================================ text-to-speech */

  var synth = window.speechSynthesis || null;
  var voices = [];
  var listeners = [];

  function loadVoices() {
    if (!synth) return;
    voices = synth.getVoices() || [];
    listeners.forEach(function (fn) { fn(); });
  }
  if (synth) {
    loadVoices();
    if (synth.addEventListener) synth.addEventListener("voiceschanged", loadVoices);
  }

  function norm(tag) { return String(tag || "").replace("_", "-").toLowerCase(); }

  /* Voices for a locale, exact locale first, then same language. */
  function voicesFor(locale) {
    var want = norm(locale), base = want.split("-")[0];
    return voices.filter(function (v) { return norm(v.lang).split("-")[0] === base; })
      .sort(function (a, b) { return (norm(a.lang) === want ? 0 : 1) - (norm(b.lang) === want ? 0 : 1); });
  }

  /* Text as it should be spoken: blanks and leftover slots removed. */
  function speakable(text) {
    return String(text || "").replace(/_{2,}/g, " ").replace(/\{\w+\}/g, " ").replace(/[«»]/g, "").replace(/\s+/g, " ").trim();
  }

  /* Speak text. Resolves when finished, or after a fallback delay, because some
   * browsers never fire "end". */
  function speak(text, locale, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var t = speakable(text);
      if (!synth || !t) { resolve(); return; }
      synth.cancel();
      var u = new SpeechSynthesisUtterance(t);
      u.lang = locale;
      var list = voicesFor(locale);
      var v = list.filter(function (x) { return x.name === opts.voiceName; })[0] || list[0];
      if (v) u.voice = v;
      u.rate = opts.rate || 0.9;
      u.pitch = opts.pitch || 1;
      var done = false;
      function finish() { if (!done) { done = true; clearTimeout(timer); resolve(); } }
      var timer = setTimeout(finish, 3000 + t.length * 160 / u.rate);
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    });
  }

  function stop() { if (synth) synth.cancel(); }

  /* The Web Speech API does not say whether a voice is a woman's or a man's.
   * A short table of known voice names (spec §4.5); unknown names give null. */
  var VOICE_GENDER = [
    [/swara|kalpana|lekha|हिन्दी|denise|julie|hortense|elo[iï]se|brigitte|vivienne|am[eé]lie|audrey|aur[eé]lie|xiaoxiao|xiaoyi|huihui|yaoyao|tingting|meijia|google fran[cç]ais|普通话/i, "f"],
    [/madhur|hemant|rishi|henri|\bpaul\b|r[eé]my|thomas|daniel|yunxi|yunyang|yunjian|kangkang/i, "m"]
  ];
  function voiceGender(name) {
    for (var i = 0; i < VOICE_GENDER.length; i++) if (VOICE_GENDER[i][0].test(name || "")) return VOICE_GENDER[i][1];
    return null;
  }

  /* ================================================================ recognition */

  var Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  var current = null;

  /* Listen once. Resolves with up to 5 transcripts, best first.
   * Rejects with { error: code }: "not-allowed", "no-speech", "audio-capture",
   * "network", "language-not-supported", "aborted", "unsupported". */
  function listen(locale) {
    return new Promise(function (resolve, reject) {
      if (!Rec) { reject({ error: "unsupported" }); return; }
      stopListening();
      stop();
      var r = new Rec();
      r.lang = locale;
      r.maxAlternatives = 5;
      r.interimResults = false;
      r.continuous = false;
      var got = null, failed = null;
      r.onresult = function (e) {
        var res = e.results[0], out = [];
        for (var i = 0; i < res.length; i++) if (res[i].transcript) out.push(res[i].transcript);
        got = out;
      };
      r.onerror = function (e) { failed = e.error || "error"; };
      r.onend = function () {
        if (current === r) current = null;
        if (got && got.length) resolve(got);
        else reject({ error: failed || "no-speech" });
      };
      current = r;
      try { r.start(); } catch (e) { current = null; reject({ error: "aborted" }); }
    });
  }

  function stopListening() { if (current) { try { current.stop(); } catch (e) { /* already stopped */ } } }

  /* ================================================================ normalising (§5.2 step 1) */

  var SLOT = "";                       /* one token that stands for a slot */
  var SLOT_RE = /\{\w+\}|_{2,}/g;
  var PUNCT_RE = /[\p{P}\p{S}]/gu;
  var MARKS_RE = /\p{M}/gu;

  function has(prof, rule) { return (prof.normalize || []).indexOf(rule) !== -1; }

  /* Normalise one string. kind "script" compares against text, "rom" against the
   * romanization (typed input). Returns a plain string, tokens separated by spaces. */
  function normalise(str, prof, kind) {
    var s = String(str == null ? "" : str).replace(SLOT_RE, " " + SLOT + " ");
    s = s.toLowerCase();
    if (kind === "rom") {
      s = s.normalize("NFD").replace(MARKS_RE, "");
      s = s.replace(/['’]/g, "");
      s = s.replace(PUNCT_RE, " ");
      if (prof.code === "hi") {
        s = s.replace(/aa+/g, "a").replace(/ee+/g, "i").replace(/oo+/g, "u").replace(/w/g, "v");
      }
      return s.replace(/\s+/g, " ").trim();
    }
    if (has(prof, "devanagari-digits")) {
      s = s.replace(/[०-९]/g, function (d) { return String(d.charCodeAt(0) - 0x0966); });
    }
    s = s.replace(/\d+/g, function (n) {
      var w = (prof.numerals || {})[String(parseInt(n, 10))];
      return " " + (w || n) + " ";
    });
    if (has(prof, "accents")) s = s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (has(prof, "apostrophes")) s = s.replace(/['’]/g, "");
    if (has(prof, "nukta")) s = s.normalize("NFD").replace(/़/g, "");
    if (has(prof, "chandrabindu")) s = s.replace(/ँ/g, "ं");
    if (has(prof, "ye-e")) {
      /* य + े or ी inside a word, not after virama: दीजिये = दीजिए, गये = गए */
      s = s.replace(/([ऀ-ॣ])य([ेी])/g, function (m, before, sign) {
        if (before === "्") return m;
        return before + (sign === "े" ? "ए" : "ई");
      });
    }
    s = s.replace(PUNCT_RE, " ");
    return s.normalize("NFC").replace(/\s+/g, " ").trim();
  }

  /* ================================================================ tokenising (§5.2 step 2) */

  function tokens(normalised, mode) {
    if (!normalised) return [];
    if (mode !== "chars") return normalised.split(" ");
    /* chars: each Han (or other) character is a token; a Latin or digit run is one */
    return normalised.match(new RegExp("[a-z0-9\\u00C0-\\u024F]+|" + SLOT + "|\\S", "g")) || [];
  }

  /* Display units of a model string, so missed words can be marked in the
   * original spelling. Each unit keeps its trailing space. */
  function units(text, mode) {
    var re = mode === "chars" ? /(\{\w+\}|_{2,}|[A-Za-zÀ-ɏ0-9'’]+|\S)(\s*)/g : /(\S+)(\s*)/g;
    var out = [], m;
    while ((m = re.exec(String(text || "")))) out.push({ text: m[1], space: m[2] });
    return out;
  }

  /* ================================================================ scoring (§5.2 step 3) */

  function lev(a, b) {
    a = Array.from(a); b = Array.from(b);
    var prev = [], cur, i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur = [i];
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[b.length];
  }

  function similarity(a, b) {
    var n = Math.max(Array.from(a).length, Array.from(b).length);
    return n ? 1 - lev(a, b) / n : 1;
  }

  function subCost(a, b) {
    if (a === b) return 0;
    return similarity(a, b) >= 0.75 ? 0.3 : 1;
  }

  /* Weighted edit distance between model tokens (may hold SLOT) and said tokens.
   * A SLOT matches a run of 1..maxRun said tokens at no cost.
   * Returns { score, marks } where marks[i] is "ok", "near" or "miss" per model token. */
  function score(model, said, mode) {
    /* Align from the end, so the back-trace runs from the start and prefers the
     * earliest match when a word repeats (मेरा नाम … है। आपका नाम … है?). */
    var r = align(model.slice().reverse(), said.slice().reverse(), mode);
    return { score: r.score, marks: r.marks.reverse() };
  }

  function align(model, said, mode) {
    var maxRun = mode === "chars" ? 4 : 3;
    var m = model.length, n = said.length, i, j, k;
    var D = [], X = [], B = [];          /* cost, extra tokens absorbed by slots, back-pointer */
    for (i = 0; i <= m; i++) { D.push([]); X.push([]); B.push([]); }
    D[0][0] = 0; X[0][0] = 0; B[0][0] = null;
    for (j = 1; j <= n; j++) { D[0][j] = j; X[0][j] = 0; B[0][j] = ["ins"]; }
    /* On equal cost, prefer more tokens absorbed by slots (a smaller
     * denominator), then the alignment that blames a slot rather than a word,
     * so the marks point at the right word. */
    var RANK = { sub: 0, delslot: 1, slot: 2, del: 3, ins: 4 };
    var best, bx, bp;
    function take(c, x, p) {
      var better = best === undefined || c < best - 1e-9 ||
        (Math.abs(c - best) < 1e-9 && (x > bx || (x === bx && RANK[p[0]] < RANK[bp[0]])));
      if (better) { best = c; bx = x; bp = p; }
    }
    for (i = 1; i <= m; i++) {
      var isSlot = model[i - 1] === SLOT;
      for (j = 0; j <= n; j++) {
        best = undefined;
        take(D[i - 1][j] + 1, X[i - 1][j], [isSlot ? "delslot" : "del"]);
        if (j > 0) take(D[i][j - 1] + 1, X[i][j - 1], ["ins"]);
        if (isSlot) {
          for (k = 1; k <= maxRun && k <= j; k++) take(D[i - 1][j - k], X[i - 1][j - k] + k - 1, ["slot", k]);
        } else if (j > 0) {
          var c = subCost(model[i - 1], said[j - 1]);
          take(D[i - 1][j - 1] + c, X[i - 1][j - 1], ["sub", c]);
        }
        D[i][j] = best; X[i][j] = bx; B[i][j] = bp;
      }
    }
    var cost = D[m][n], longer = Math.max(m, n - X[m][n]);
    var marks = [];
    for (i = m, j = n; i > 0 || j > 0;) {
      var p = B[i][j];
      if (!p || p[0] === "ins") { j--; continue; }
      if (p[0] === "del" || p[0] === "delslot") { marks[i - 1] = "miss"; i--; continue; }
      if (p[0] === "slot") { marks[i - 1] = "ok"; i--; j -= p[1]; continue; }
      marks[i - 1] = p[1] === 0 ? "ok" : p[1] < 1 ? "near" : "miss";
      i--; j--;
    }
    return { score: longer ? Math.max(0, 1 - cost / longer) : 1, marks: marks };
  }

  /* ================================================================ forms of an item */

  /* "रहता / रहती" means either word: expand into one string per choice. */
  function expandChoices(text) {
    var m = /(\S+)\s+\/\s+(\S+)/.exec(text || "");
    if (!m) return [text];
    var head = text.slice(0, m.index), tail = text.slice(m.index + m[0].length);
    return expandChoices(head + m[1] + tail).concat(expandChoices(head + m[2] + tail));
  }

  /* Every acceptable form of a resolved item (spec §3.4 resolution already done):
   * the text, each variant, each accept. Models are the forms shown to the learner. */
  function formsOf(res) {
    var out = [];
    function add(text, rom, model) {
      if (!text) return;
      var t = expandChoices(text), r = rom ? expandChoices(rom) : [];
      t.forEach(function (x, i) { out.push({ text: x, rom: r.length === t.length ? r[i] : (r[0] || null), model: model, shown: text, shownRom: rom || null }); });
    }
    if (res.variants && res.variants.length) res.variants.forEach(function (v) { add(v.text, v.rom, true); });
    else add(res.text, res.rom, true);
    (res.accept || []).forEach(function (a) {
      if (typeof a === "string") add(a, null, false);
      else if (a && a.text) add(a.text, a.rom, false);
    });
    return out;
  }

  /* ================================================================ matching a line (§5.2 steps 4–7) */

  var GOOD = 0.8, NEARLY = 0.55;

  function verdictOf(s) { return s >= GOOD ? "good" : s >= NEARLY ? "nearly" : "notquite"; }

  /* Best score of any said alternative against any form. */
  function bestOf(saidList, forms, prof) {
    var mode = prof.match === "chars" ? "chars" : "words";
    var best = { score: -1 };
    saidList.forEach(function (said) {
      var sS = tokens(normalise(said, prof, "script"), mode);
      var sR = tokens(normalise(said, prof, "rom"), "words");
      forms.forEach(function (f) {
        var r = score(tokens(normalise(f.text, prof, "script"), mode), sS, mode);
        if (r.score > best.score) best = { score: r.score, form: f, by: "text", said: said };
        if (f.rom) {
          var q = score(tokens(normalise(f.rom, prof, "rom"), "words"), sR, "words");
          if (q.score > best.score) best = { score: q.score, form: f, by: "rom", said: said };
        }
      });
    });
    return best;
  }

  /* Marks for showing the result: the model text split into display units,
   * each "ok", "near" or "miss". Uses the model form closest to what was said. */
  function markUp(form, said, prof, by) {
    var mode = by === "rom" ? "words" : (prof.match === "chars" ? "chars" : "words");
    var kind = by === "rom" ? "rom" : "script";
    var src = by === "rom" ? (form.shownRom || form.rom) : form.shown;
    var us = units(src, mode), model = [], owner = [];
    us.forEach(function (u, ui) {
      tokens(normalise(u.text, prof, kind), mode).forEach(function (t) { model.push(t); owner.push(ui); });
    });
    var r = score(model, tokens(normalise(said, prof, kind), mode), mode);
    var rank = { ok: 0, near: 1, miss: 2 }, names = ["ok", "near", "miss"];
    var worst = us.map(function () { return 0; });
    r.marks.forEach(function (mk, i) { worst[owner[i]] = Math.max(worst[owner[i]], rank[mk || "miss"]); });
    return us.map(function (u, i) { return { text: u.text, space: u.space, mark: names[worst[i]] }; });
  }

  /* Match what was said against a line.
   *   saidList   recognition alternatives, or [typed text]
   *   byRegister { registerId: resolvedItem } for every allowed register
   *   selected   the selected register id
   *   labels     { registerId: label } for the wrong-register message
   *   gendered   optional: forms left out by gender (content.js forGender), checked
   *              the same way as another register (spec §5.2 step 6)
   * Returns { verdict, score, wrongRegister, label, wrongGender, model, by, units }.
 * by is "text" or "rom": which form the units are taken from. */
  function matchLine(saidList, byRegister, selected, prof, labels, gendered) {
    var sel = bestOf(saidList, formsOf(byRegister[selected]), prof);
    var out = { verdict: verdictOf(sel.score), score: Math.max(0, sel.score), wrongRegister: null, label: null };
    var other = null;
    Object.keys(byRegister).forEach(function (reg) {
      if (reg === selected) return;
      var b = bestOf(saidList, formsOf(byRegister[reg]), prof);
      if (b.score >= GOOD && b.score > sel.score + 1e-9 && (!other || b.score > other.best.score)) other = { reg: reg, best: b };
    });
    if (other) {
      out.verdict = "nearly";
      out.wrongRegister = other.reg;
      out.label = (labels || {})[other.reg] || other.reg;
    }
    if (gendered && !out.wrongRegister) {
      var g = bestOf(saidList, formsOf(gendered), prof);
      if (g.score >= GOOD && g.score > sel.score + 1e-9) { out.verdict = "nearly"; out.wrongGender = gendered.message; }
    }
    if (sel.form) {
      var shown = sel.form.model ? sel.form : formsOf(byRegister[selected])[0];
      out.model = shown;
      out.by = sel.form.model ? sel.by : "text";
      out.units = markUp(shown, sel.said, prof, out.by);
    }
    return out;
  }

  /* ================================================================ chunks (§3.9) */

  /* Where a chunk sits in a line: { start, end }, indexes of the line's display
   * units (units(lineText)), or null. The chunk's words must appear in a row. A gap
   * (___) matches 1–3 words, or 1–4 characters in chars mode; a {slot} in the line
   * counts as one word. The checker uses the same rule. */
  function locate(chunkText, lineText, prof) {
    var mode = prof.match === "chars" ? "chars" : "words", run = mode === "chars" ? 4 : 3;
    var lt = [], owner = [];
    units(lineText, mode).forEach(function (u, ui) {
      tokens(normalise(u.text, prof, "script"), mode).forEach(function (t) { lt.push(t); owner.push(ui); });
    });
    function at(ct, ci, li) {      /* end index (exclusive) of a match from li, or -1 */
      if (ci === ct.length) return li;
      if (ct[ci] === SLOT) {
        for (var k = 1; k <= run && li + k <= lt.length; k++) {
          var e = at(ct, ci + 1, li + k);
          if (e !== -1) return e;
        }
        return -1;
      }
      return li < lt.length && lt[li] === ct[ci] ? at(ct, ci + 1, li + 1) : -1;
    }
    var choices = expandChoices(chunkText);
    for (var c = 0; c < choices.length; c++) {
      var ct = tokens(normalise(choices[c], prof, "script"), mode);
      if (!ct.length) continue;
      for (var i = 0; i < lt.length; i++) {
        var end = at(ct, 0, i);
        if (end !== -1) return { start: owner[i], end: owner[end - 1] };
      }
    }
    return null;
  }

  /* Echo build-up pieces for a resolved chunk (spec §4.2 step 4), shortest first,
   * ending with the whole chunk: its chain when that fits this register, else the
   * endings by word for chunks of 4 or more words. A word is something with a
   * letter, digit or gap in it: French "appelez-vous ?" keeps its "?" with the word
   * before. No piece starts with a gap. Mandarin builds up only from a chain. */
  function buildUp(res, item, prof) {
    var text = res.text || "", rom = res.rom || "";
    var norm = function (t) { return normalise(t, prof, "script"); };
    var chain = (item && item.chain) || [];
    if (chain.length && chain.every(function (p) { var a = norm(text), b = norm(p); return a.slice(a.length - b.length) === b; })) {
      var out = chain.map(function (p) { return { text: p, rom: "" }; });
      if (norm(chain[chain.length - 1]) !== norm(text)) out.push({ text: text, rom: rom });
      else out[out.length - 1] = { text: text, rom: rom };
      return out;
    }
    function words(t) {
      var ws = [];
      String(t).trim().split(/\s+/).forEach(function (w) {
        if (ws.length && !/[\p{L}\p{N}_]/u.test(w)) ws[ws.length - 1] += " " + w;
        else if (w) ws.push(w);
      });
      return ws;
    }
    var w = words(text), rw = words(rom);
    if (prof.match === "chars" || w.length < 4) return [{ text: text, rom: rom }];
    return w.map(function (x, i) {
      var n = i + 1;
      return { text: w.slice(w.length - n).join(" "), rom: rw.length === w.length ? rw.slice(rw.length - n).join(" ") : (n === w.length ? rom : "") };
    }).filter(function (p, i) { return i === w.length - 1 || !/^_{2,}/.test(p.text); });
  }

  /* ================================================================ coverage (§5.3) */

  /* Best score of a phrase's forms against any run of tokens in one transcript. */
  function findIn(said, forms, prof) {
    var mode = prof.match === "chars" ? "chars" : "words", best = 0;
    var sS = tokens(normalise(said, prof, "script"), mode);
    var sR = tokens(normalise(said, prof, "rom"), "words");
    function scan(model, s, md) {
      if (!model.length || !s.length) return;
      var slots = model.filter(function (t) { return t === SLOT; }).length;
      var maxLen = model.length + slots * (md === "chars" ? 3 : 2) + 2;
      for (var a = 0; a < s.length; a++) {
        for (var b = a + 1; b <= s.length && b - a <= maxLen; b++) {
          var r = score(model, s.slice(a, b), md).score;
          if (r > best) best = r;
        }
      }
    }
    forms.forEach(function (f) {
      scan(tokens(normalise(f.text, prof, "script"), mode), sS, mode);
      if (f.rom) scan(tokens(normalise(f.rom, prof, "rom"), "words"), sR, "words");
    });
    return best;
  }

  /* Was a phrase used in a transcript?
   *   byRegister  { registerId: resolvedItem } for every allowed register
   * Returns { used: bool, wrongRegister: id or null } */
  function phraseUsed(said, byRegister, selected, prof) {
    if (findIn(said, formsOf(byRegister[selected]), prof) >= GOOD) return { used: true, wrongRegister: null };
    var wrong = null;
    Object.keys(byRegister).forEach(function (reg) {
      if (reg !== selected && !wrong && findIn(said, formsOf(byRegister[reg]), prof) >= GOOD) wrong = reg;
    });
    return { used: false, wrongRegister: wrong };
  }

  var COVERAGE_GOOD = 0.75;

  window.SpeakSpeech = {
    /* text-to-speech */
    available: !!synth,
    voicesFor: voicesFor,
    hasVoices: function () { return voices.length > 0; },
    onVoices: function (fn) { listeners.push(fn); },
    speak: speak,
    stop: stop,
    /* recognition */
    voiceGender: voiceGender,
    canListen: !!Rec,
    listen: listen,
    stopListening: stopListening,
    /* matching */
    normalise: normalise,
    tokens: tokens,
    units: units,
    locate: locate,
    buildUp: buildUp,
    score: score,
    formsOf: formsOf,
    matchLine: matchLine,
    phraseUsed: phraseUsed,
    GOOD: GOOD,
    NEARLY: NEARLY,
    COVERAGE_GOOD: COVERAGE_GOOD
  };
})();
