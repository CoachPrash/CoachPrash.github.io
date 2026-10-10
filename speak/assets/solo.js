/* Speak: solo mode (spec §4.3). One learner on their own device. The browser
 * plays the partner and checks what the learner says (spec §5). Scores are
 * shown during the run and kept nowhere.
 *
 * Uses window.SpeakContent, window.SpeakSpeech and window.SpeakUI (app.js).
 * Exposes window.SpeakSolo.
 */
(function () {
  "use strict";

  var C = window.SpeakContent;
  var S = window.SpeakSpeech;

  var limitShown = false;       /* the recognition limit is stated once per page load (§5.2) */
  var listenBlocked = null;     /* why recognition cannot be used, once we know */

  var VERDICT = { good: "Good", nearly: "Nearly", notquite: "Not quite" };
  var RANK = { skipped: 0, notquite: 1, nearly: 2, good: 3 };

  function start(run, code, id, sc) {
    var U = window.SpeakUI;
    var esc = U.esc, el = U.el, $ = U.$, $all = U.$all, settings = U.settings;
    var $app = U.app;
    var prof = sc.profile, bp = sc.blueprint, real = sc.real;
    var allowed = real.registers || [prof.defaultRegister];
    var labels = {};
    prof.registers.forEach(function (r) { labels[r.id] = r.label; });

    var st = {
      reg: U.initialRegister(prof, real),
      phase: "setup",           /* setup, turns, free, end */
      plan: [], idx: 0,
      attempt: null,            /* last result on the current turn */
      showAnswer: false,
      listening: false,
      played: {},               /* partner turns already played aloud */
      changed: {},
      free: { ticks: {}, flags: {}, heard: [], done: false },
      showLimit: !limitShown    /* on this run's setup screen, first solo run of the page load */
    };
    limitShown = true;

    document.title = "Solo · " + bp.title + " · " + prof.name + " · Speak";

    /* ---------- content helpers ---------- */

    function res(item) { return C.resolve(item || {}, st.reg, prof.defaultRegister); }
    function byReg(item) {
      var out = {};
      allowed.forEach(function (r) { out[r] = C.resolve(item || {}, r, prof.defaultRegister); });
      return out;
    }
    function blankVals(s, v) { v.text[s] = v.rom[s] = "___"; v.en[s] = "(" + bp.slots[s].cue + ")"; }

    /* Slot values for a turn. The partner uses partnerValues for personal slots;
     * the learner's own personal slots stay blank. Set slots use setIndex. */
    function valsFor(turn, partner) {
      var v = { text: {}, rom: {}, en: {} };
      Object.keys(bp.slots || {}).forEach(function (s) {
        var def = bp.slots[s], val = null;
        if (def.kind === "set") {
          var list = (real.slotValues || {})[s] || [];
          val = list.length ? list[turn.setIndex % list.length] : null;
        } else if (partner) {
          val = (real.partnerValues || {})[s] || null;
        }
        if (val) { v.text[s] = val.text; v.rom[s] = val.rom || val.text; v.en[s] = val.en; }
        else blankVals(s, v);
      });
      return v;
    }

    /* Dialogue runs, then the drill (spec §4.3). */
    function buildPlan(role) {
      var plan = [], roles = role === "both" ? ["A", "B"] : [role];
      roles.forEach(function (me, run) {
        bp.lines.forEach(function (l, li) {
          plan.push({ kind: "dialogue", run: run, me: me, line: l, li: li, mine: l.role === me, setIndex: 0 });
        });
      });
      var slot = bp.drill && bp.drill.slot, def = slot && bp.slots[slot];
      if (def) {
        var lines = bp.lines.filter(function (l) { return C.slotsIn(l.en).indexOf(slot) !== -1; });
        var n = def.kind === "set" ? ((real.slotValues || {})[slot] || []).length : 1;
        for (var i = 0; i < n; i++) {
          lines.forEach(function (l) { plan.push({ kind: "drill", line: l, mine: true, setIndex: i, me: l.role }); });
        }
      }
      return plan;
    }

    function partnerName() {
      var pv = (real.partnerValues || {}).name;
      return pv ? pv.en : "Partner";
    }

    /* ---------- speech ---------- */

    function hasVoice() { return S.available && S.voicesFor(prof.locale).length > 0; }
    function canListen() { return S.canListen && !listenBlocked; }

    function sayLine(turn, partner) {
      var r = res(real.lines[turn.line.id]);
      return U.say(U.sayText(r, valsFor(turn, partner), bp, real), prof);
    }

    function listenErr(code) {
      if (code === "not-allowed" || code === "service-not-allowed") {
        listenBlocked = "The microphone is blocked for this site. Allow it from the address bar and reload, or type your answers.";
      } else if (code === "language-not-supported") {
        listenBlocked = "This browser cannot recognise " + prof.name + ". Type your answers instead.";
      } else if (code === "unsupported") {
        listenBlocked = "This browser has no speech recognition. Type your answers instead. Chrome, Edge and Safari have it.";
      } else if (code === "no-speech") {
        U.toast("Nothing heard. Tap Speak, then talk.");
      } else if (code === "audio-capture") {
        U.toast("No microphone found. Type your answer instead.");
      } else if (code === "network") {
        U.toast("Recognition needs a network connection. Try again, or type your answer.");
      }
    }

    /* Listen once, then hand the transcripts to done(). */
    function listen(done) {
      if (st.listening) { S.stopListening(); return; }
      st.listening = true;
      render();
      S.listen(prof.locale).then(function (alts) {
        st.listening = false;
        if (U.alive(run)) done(alts);
      }, function (e) {
        st.listening = false;
        listenErr(e && e.error);
        if (U.alive(run)) render();
      });
    }

    /* ---------- changed-line marker (§4.6) ---------- */

    function snapshot() {
      var out = {};
      $all("[data-key]", $app).forEach(function (n) { out[n.getAttribute("data-key")] = n.textContent; });
      return out;
    }
    function markChanged() {
      $all("[data-key]", $app).forEach(function (n) {
        if (st.changed[n.getAttribute("data-key")]) n.classList.add("changed");
      });
    }

    /* ---------- pieces ---------- */

    function head() {
      var h = el('<header class="solohead"><div class="titlebar">' +
        U.scenarioTrail(prof, bp.title, code, id, "solo") + U.statusBadge(real) + "</div></header>");
      h.appendChild(U.buildToolbar(prof, real, st.reg, {
        rerender: render,
        onRegister: function (reg) {
          var before = snapshot();
          st.reg = reg;
          st.attempt = null;
          render();
          var after = snapshot();
          Object.keys(after).forEach(function (k) { if (before[k] !== undefined && before[k] !== after[k]) st.changed[k] = true; });
          markChanged();
        }
      }));
      return h;
    }

    function notices() {
      var out = "";
      if (st.showLimit && st.phase === "setup") {
        out += '<p class="notice">Speech checking shows whether the browser understood your words. It does not judge pronunciation' +
          (prof.code === "zh" ? " or tones" : "") + ". A native speaker does that.</p>";
      }
      if (!S.canListen || listenBlocked) {
        out += '<p class="notice warn">' + esc(listenBlocked || "This browser has no speech recognition. Type your answers instead. Chrome, Edge and Safari have it.") + "</p>";
      }
      if (S.available && S.hasVoices() && !hasVoice()) {
        out += '<p class="notice warn">No ' + esc(prof.name) + " voice on this device, so your partner's lines are shown but not spoken. Add a " +
          esc(prof.name) + " voice in your system's language or speech settings.</p>";
      }
      return out;
    }

    /* Typed answer, Speak button. onSaid(list of strings) */
    function answerControls(onSaid, placeholder) {
      var box = el('<div class="answer"></div>');
      if (canListen()) {
        var mic = el('<button type="button" class="btn primary mic' + (st.listening ? " on" : "") + '">' +
          (st.listening ? "● Listening… tap to stop" : "🎤 Speak") + "</button>");
        mic.onclick = function () { listen(onSaid); };
        box.appendChild(mic);
      }
      var form = el('<form class="typed"><input type="text" lang="' + esc(prof.code) + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' +
        esc(placeholder) + '" aria-label="Type your answer"><button type="submit" class="btn">Check</button></form>');
      form.onsubmit = function (e) {
        e.preventDefault();
        var v = $("input", form).value.trim();
        if (v) { st.refocus = true; onSaid([v]); }
      };
      box.appendChild(form);
      return box;
    }

    function typedHint() {
      return prof.romanization ? "Type in " + prof.script + " or in romanization" : "Type your answer";
    }

    /* The model with missed words marked (§4.3 step 4). */
    function marked(r, vals) {
      if (!r.units) return "";
      var v = r.by === "rom" ? vals.rom : vals.text;
      return '<div class="marked' + (r.by === "rom" ? " rom" : "") + '" lang="' + (r.by === "rom" ? "en" : esc(prof.code)) + '">' + r.units.map(function (u) {
        return '<span class="m-' + u.mark + '">' + esc(C.fill(u.text, v)) + "</span>" + esc(u.space);
      }).join("") + "</div>";
    }

    /* ---------- screens ---------- */

    function setupBody() {
      var notes = (real.notes || []).map(function (n) { return '<li lang="' + esc(code) + '">' + esc(n) + "</li>"; }).join("");
      var body = el('<section class="wrap solo"><h1>' + esc(bp.title) + '</h1><p class="lede">' + esc(bp.goal) + "</p>" + notices() +
        "<h2>Pick your role</h2><p class=\"hint\">The browser speaks the other part. You answer each of your lines by speaking or typing.</p>" +
        '<div class="roles"></div>' + (notes ? "<h3>In " + esc(prof.name) + "</h3><ul class=\"notes\">" + notes + "</ul>" : "") + "</section>");
      var roles = $(".roles", body);
      [["A", "A: " + bp.roles.A], ["B", "B: " + bp.roles.B], ["both", "Both, one after the other"]].forEach(function (r) {
        var b = el('<button type="button" class="btn rolebtn">' + esc(r[1]) + "</button>");
        b.onclick = function () {
          st.plan = buildPlan(r[0]);
          st.idx = 0; st.attempt = null; st.showAnswer = false; st.played = {};
          st.free = { ticks: {}, flags: {}, heard: [], done: false };
          st.phase = st.plan.length ? "turns" : "free";
          render();
        };
        roles.appendChild(b);
      });
      return body;
    }

    function progress(turn) {
      if (turn.kind === "drill") {
        var drills = st.plan.filter(function (t) { return t.kind === "drill"; });
        return "Drill · " + (drills.indexOf(turn) + 1) + " of " + drills.length;
      }
      var runs = st.plan.filter(function (t) { return t.kind === "dialogue" && t.run === turn.run; });
      var both = st.plan.some(function (t) { return t.run === 1; });
      return "Dialogue" + (both ? " · run " + (turn.run + 1) + " of 2, you are " + turn.me : " · you are " + turn.me) +
        " · line " + (runs.indexOf(turn) + 1) + " of " + runs.length;
    }

    /* Earlier lines of this run, in the current register. */
    function history(turn) {
      if (turn.kind !== "dialogue") return "";
      var done = st.plan.filter(function (t) { return t.kind === "dialogue" && t.run === turn.run && t.li < turn.li; });
      if (!done.length) return "";
      return '<ol class="dialogue small history">' + done.map(function (t) {
        var r = res(real.lines[t.line.id]), vals = valsFor(t, !t.mine);
        return '<li class="line ' + (t.mine ? "me" : "them") + '" data-key="h-' + t.run + "-" + esc(t.line.id) + '"><span class="who">' +
          (t.mine ? "You" : esc(partnerName())) + '</span><div class="body">' + U.target(r, prof, { vals: vals }) + "</div></li>";
      }).join("") + "</ol>";
    }

    function next() {
      st.attempt = null; st.showAnswer = false; st.changed = {};
      S.stop(); S.stopListening();
      st.idx++;
      if (st.idx >= st.plan.length) st.phase = "free";
      render();
    }

    function partnerTurn(turn) {
      var r = res(real.lines[turn.line.id]), vals = valsFor(turn, true);
      var card = el('<div class="card them"><div class="who">' + esc(partnerName()) + " (" + turn.line.role + ")</div>" +
        '<div class="big" data-key="cur">' + U.target(r, prof, { en: turn.line.en, vals: vals }) + "</div>" +
        '<div class="actions"></div></div>');
      var acts = $(".actions", card);
      if (hasVoice()) {
        var again = el('<button type="button" class="btn">▶ Hear again</button>');
        again.onclick = function () { sayLine(turn, true); };
        acts.appendChild(again);
      }
      var nx = el('<button type="button" class="btn primary">Next →</button>');
      nx.onclick = next;
      acts.appendChild(nx);
      /* Play once on arrival, then move on by itself. */
      if (hasVoice() && !st.played[st.idx]) {
        st.played[st.idx] = true;
        var at = st.idx;
        sayLine(turn, true).then(function () {
          setTimeout(function () { if (U.alive(run) && st.phase === "turns" && st.idx === at && !st.listening) next(); }, 700);
        });
      }
      return card;
    }

    function learnerTurn(turn) {
      var item = real.lines[turn.line.id], r = res(item), vals = valsFor(turn, false);
      var cue = C.fill(turn.line.en, vals.en);
      var card = el('<div class="card me"><div class="who">You (' + esc(turn.line.role) + ")</div>" +
        (turn.kind === "drill" ? '<p class="hint">Say the whole line. The check covers the sentence around the ' + esc(bp.slots[bp.drill.slot].cue) +
          ", not that word itself.</p>" : "") +
        '<div class="cue">' + esc(cue) + "</div>" +
        (st.showAnswer ? '<div class="big answer-model" data-key="cur">' + U.target(r, prof, { vals: vals, note: true }) + "</div>" : "") +
        '<div class="answer-slot"></div><div class="result"></div><div class="actions more"></div></div>');

      function onSaid(alts) {
        var m = S.matchLine(alts, byReg(item), st.reg, prof, labels);
        m.said = alts[0];
        st.attempt = m;
        if (RANK[m.verdict] > RANK[turn.best || "skipped"]) turn.best = m.verdict;
        render();
      }

      var a = st.attempt;
      if (a) {
        $(".result", card).appendChild(el('<div class="verdict v-' + a.verdict + '"><b>' + VERDICT[a.verdict] + "</b> " + Math.round(a.score * 100) + "%" +
          (a.wrongRegister ? ' · That was the <span lang="' + esc(code) + '">' + esc(a.label) + "</span> form." : "") + "</div>"));
        $(".result", card).appendChild(el("<div>" + marked(a, vals) +
          (settings.rom && a.by !== "rom" && a.model && a.model.rom ? '<div class="rom">' + esc(C.fill(a.model.rom, vals.rom)) + "</div>" : "") +
          '<div class="heard">Heard: <span lang="' + esc(code) + '">' + esc(a.said) + "</span></div></div>"));
      }
      $(".answer-slot", card).appendChild(answerControls(onSaid, typedHint()));

      var more = $(".more", card);
      function btn(label, fn, primary) {
        var b = el('<button type="button" class="btn' + (primary ? " primary" : "") + '">' + label + "</button>");
        b.onclick = fn;
        more.appendChild(b);
      }
      if (hasVoice()) btn("▶ Hear it", function () { sayLine(turn, false); });
      btn(st.showAnswer ? "Hide answer" : "Show answer", function () { st.showAnswer = !st.showAnswer; render(); });
      if (a) {
        btn("Try again", function () { st.attempt = null; render(); });
        btn("Next →", next, true);
      } else {
        btn("Skip", function () { if (!turn.best) turn.best = "skipped"; next(); });
      }
      return card;
    }

    function turnsBody() {
      var turn = st.plan[st.idx];
      var body = el('<section class="wrap solo"><div class="counter">' + esc(progress(turn)) + "</div>" + notices() + history(turn) + "</section>");
      body.appendChild(turn.mine ? learnerTurn(turn) : partnerTurn(turn));
      return body;
    }

    /* ---------- free practice (§4.3, §5.3) ---------- */

    function phrases() {
      var out = [];
      ((bp.free || {}).targets || []).forEach(function (t) {
        out.push({ key: "t-" + t.id, en: t.en, item: ((real.free || {}).targets || {})[t.id] || {} });
      });
      bp.vocab.forEach(function (v) { out.push({ key: "v-" + v.id, en: v.en, item: real.vocab[v.id] || {} }); });
      return out;
    }

    function freeSaid(alts) {
      var f = st.free;
      f.heard.push(alts[0]);
      phrases().forEach(function (p) {
        if (f.ticks[p.key]) return;
        var wrong = null;
        for (var i = 0; i < alts.length; i++) {
          var u = S.phraseUsed(alts[i], byReg(p.item), st.reg, prof);
          if (u.used) { f.ticks[p.key] = true; delete f.flags[p.key]; return; }
          if (u.wrongRegister) wrong = u.wrongRegister;
        }
        if (wrong) f.flags[p.key] = labels[wrong] || wrong;
      });
      render();
    }

    function freeBody() {
      var f = st.free, list = phrases();
      var used = list.filter(function (p) { return f.ticks[p.key]; }).length;
      var good = list.length && used / list.length >= S.COVERAGE_GOOD;
      var body = el('<section class="wrap solo"><div class="counter">Free practice</div>' + notices() +
        '<div class="goal small">' + esc(bp.free.prompt) + "</div>" +
        '<p class="hint">No script and no timer. Say as much as you like. Each phrase you use gets a tick.</p>' +
        '<div class="coverage"><b>' + used + " of " + list.length + " phrases used</b>" +
        (f.done ? ' · <span class="v-' + (good ? "good" : "nearly") + '">' + (good ? "Good" : "Keep going") + "</span>" : "") +
        '<div class="hint">This counts the phrases you used. It does not check the grammar between them.</div></div>' +
        '<div class="heardlist"></div><ul class="phrases checklist"></ul><div class="actions done"></div></section>');
      if (!f.done) body.insertBefore(answerControls(freeSaid, typedHint()), $(".heardlist", body));
      $(".heardlist", body).innerHTML = f.heard.map(function (h) { return '<div class="heard" lang="' + esc(code) + '">“' + esc(h) + "”</div>"; }).join("");
      var ul = $(".checklist", body);
      list.forEach(function (p) {
        var cls = f.ticks[p.key] ? "tick" : f.flags[p.key] ? "flag" : f.done ? "unused" : "";
        ul.appendChild(el('<li class="' + cls + '" data-key="p-' + esc(p.key) + '"><span class="mark">' + (f.ticks[p.key] ? "✓" : f.flags[p.key] ? "!" : "") + "</span>" +
          "<div>" + U.target(res(p.item), prof, { en: p.en }) +
          (f.flags[p.key] ? '<div class="flagmsg">That was the <span lang="' + esc(code) + '">' + esc(f.flags[p.key]) + "</span> form.</div>" : "") + "</div></li>"));
      });
      var acts = $(".done", body);
      if (!f.done) {
        var d = el('<button type="button" class="btn primary">Done</button>');
        d.onclick = function () { S.stopListening(); f.done = true; render(); };
        acts.appendChild(d);
      } else {
        var e = el('<button type="button" class="btn primary">See summary →</button>');
        e.onclick = function () { st.phase = "end"; render(); };
        acts.appendChild(e);
      }
      return body;
    }

    /* ---------- end (§4.3): a summary, not stored ---------- */

    function endBody() {
      function line(kind, label) {
        var mine = st.plan.filter(function (t) { return t.kind === kind && t.mine; });
        if (!mine.length) return "";
        var good = mine.filter(function (t) { return t.best === "good"; }).length;
        return "<li>" + label + ": <b>" + good + " of " + mine.length + "</b> said well</li>";
      }
      var list = phrases(), used = list.filter(function (p) { return st.free.ticks[p.key]; });
      var unused = list.filter(function (p) { return !st.free.ticks[p.key]; });
      var body = el('<section class="wrap solo"><h1>Done</h1><ul class="summary">' +
        line("dialogue", "Dialogue") + line("drill", "Drill") +
        "<li>Free practice: <b>" + used.length + " of " + list.length + "</b> phrases used</li></ul>" +
        (unused.length ? "<h3>Phrases to try next time</h3><ul class=\"phrases\">" + unused.map(function (p) {
          return "<li>" + U.target(res(p.item), prof, { en: p.en }) + "</li>";
        }).join("") + "</ul>" : "") +
        '<p class="hint">Nothing is saved. Run it again in another formality, or move on.</p>' +
        '<div class="actions"><button type="button" class="btn primary" id="again">Run again</button>' +
        '<a class="btn" href="#' + esc(code) + '">All scenarios</a>' +
        '<a class="btn" href="#' + esc(code) + "/" + esc(id) + '/class">Class mode</a></div></section>');
      $("#again", body).onclick = function () { st.phase = "setup"; render(); };
      return body;
    }

    /* ---------- render ---------- */

    function render() {
      if (!U.alive(run)) return;
      document.body.className = "solomode";
      var y = window.scrollY;
      $app.innerHTML = "";
      $app.appendChild(head());
      var body = { setup: setupBody, turns: turnsBody, free: freeBody, end: endBody }[st.phase]();
      $app.appendChild(body);
      markChanged();
      window.scrollTo(0, st.phase === "turns" ? document.body.scrollHeight : y);
      if (st.refocus) {
        st.refocus = false;
        var inp = $(".typed input", $app);
        if (inp) inp.focus({ preventScroll: true });
      }
      U.page.keys = null;
    }

    S.onVoices(function () {
      if (!U.alive(run)) return;
      var sel = $(".toolbar .voice select");
      if (sel) U.fillVoices(sel, prof);
    });
    render();
  }

  window.SpeakSolo = { start: start };
})();
