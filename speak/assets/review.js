/* Speak: Review (spec §4.7). Flashcards of chunks from earlier stages,
 * shuffled. Two ways to use them: Flip (self-check, works on a shared screen)
 * and Say it (the matcher checks). Nothing is stored.
 *
 * Uses window.SpeakContent, window.SpeakSpeech and window.SpeakUI (app.js).
 * Exposes window.SpeakReview.
 */
(function () {
  "use strict";

  var C = window.SpeakContent;
  var S = window.SpeakSpeech;

  var RUN = 10;   /* cards per run (spec §4.7) */
  var VERDICT = { good: "Good", nearly: "Nearly", notquite: "Not quite" };

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1)), t = a[i];
      a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* Cards for stages 1..upto in this language: one per chunk, extra chunks included. */
  function loadCards(code, lad, upto) {
    var jobs = [];
    lad.stages.forEach(function (st) {
      if (st.stage > upto) return;
      st.scenarios.forEach(function (id) { jobs.push({ st: st, id: id }); });
    });
    return Promise.all(jobs.map(function (j) { return C.scenario(code, j.id); })).then(function (scs) {
      var cards = [];
      scs.forEach(function (sc, i) {
        if (!sc) return;
        var bp = sc.blueprint, real = sc.real;
        bp.chunks.forEach(function (c) {
          if (!real.chunks[c.id]) return;
          cards.push({ key: jobs[i].id + "/" + c.id, en: c.en, item: real.chunks[c.id], bp: bp, real: real,
            stage: jobs[i].st.stage, stageTitle: bp.title || jobs[i].st.title });
        });
      });
      return oneAnswer(cards, lad);
    });
  }

  /* One answer per card (spec §4.7): chunks with the same English cue become
   * one card. The same text in two scenarios is one card; different texts
   * (igualmente, a mí también for "me too") are all right answers. */
  function oneAnswer(cards, lad) {
    var by = {}, out = [];
    cards.forEach(function (c) {
      var k = String(c.en).toLowerCase().replace(/\s+/g, " ").trim();
      var first = by[k];
      if (!first) { by[k] = c; c.others = []; c.stages = [c.stage + " · " + c.stageTitle]; out.push(c); return; }
      var tag = c.stage + " · " + c.stageTitle;
      if (first.stages.indexOf(tag) === -1) first.stages.push(tag);
      var same = [first].concat(first.others).some(function (o) { return o.item.text === c.item.text; });
      if (!same) first.others.push(c);
    });
    return out;
  }

  function start(run, code, upto) {
    var U = window.SpeakUI;
    var esc = U.esc, el = U.el, $ = U.$, $all = U.$all, settings = U.settings, $app = U.app;

    Promise.all([C.ladder(), C.profile(code)]).then(function (r) {
      if (!U.alive(run)) return;
      var lad = r[0], prof = r[1];
      if (!lad || !prof) return U.notFound("No such language.");
      /* Stages that have content in this language. */
      return Promise.all(lad.stages.map(function (st) {
        return Promise.all(st.scenarios.map(function (id) { return C.realization(code, id); }));
      })).then(function (reals) {
        if (!U.alive(run)) return;
        var have = lad.stages.filter(function (st, i) { return reals[i].some(Boolean); }).map(function (st) { return st.stage; });
        if (!have.length) return U.notFound("Nothing to review in " + prof.name + " yet.");
        var top = have[have.length - 1];
        if (!upto || upto > top) upto = top;
        if (upto < have[0]) upto = have[0];
        return loadCards(code, lad, upto).then(function (cards) {
          if (!U.alive(run)) return;
          screen(run, code, prof, have, upto, cards);
        });
      });
    });

    function screen(run, code, prof, have, upto, cards) {
      document.title = "Review · " + prof.name + " · Speak";
      /* The switch offers every register some scenario allows; a card whose
       * scenario does not allow the selected one falls back to the default. */
      var allRegs = prof.registers.map(function (x) { return x.id; }).filter(function (rg) {
        return cards.some(function (c) { return (c.real.registers || [prof.defaultRegister]).indexOf(rg) !== -1; });
      });
      var whole = { registers: allRegs };
      var labels = {};
      prof.registers.forEach(function (x) { labels[x.id] = x.label; });

      var saved = U.load("register." + code, null);
      var st = {
        reg: allRegs.indexOf(saved) !== -1 ? saved : prof.defaultRegister,
        mode: "flip",          /* flip or say */
        deck: shuffle(cards.slice()), pos: 0,
        queue: [], idx: 0, flipped: false, attempt: null, listening: false,
        first: {}, back: {}, done: false
      };

      function deal() {
        st.queue = [];
        for (var i = 0; i < Math.min(RUN, cards.length); i++) {
          if (st.pos >= st.deck.length) { st.deck = shuffle(cards.slice()); st.pos = 0; }
          st.queue.push(st.deck[st.pos++]);
        }
        st.idx = 0; st.flipped = false; st.attempt = null; st.first = {}; st.back = {}; st.done = false;
      }

      /* The register a card uses: the selected one if its scenario allows it. */
      function regFor(card) {
        var ok = card.real.registers || [prof.defaultRegister];
        return ok.indexOf(st.reg) !== -1 ? st.reg : prof.defaultRegister;
      }
      function res(card) { return C.resolve(card.item, regFor(card), prof.defaultRegister); }
      function byReg(card) {
        var out = {};
        (card.real.registers || [prof.defaultRegister]).forEach(function (rg) { out[rg] = C.resolve(card.item, rg, prof.defaultRegister); });
        return out;
      }
      function hasVoice() { return S.available && S.voicesFor(prof.locale).length > 0; }
      function play(card) { if (hasVoice()) U.say(U.chunkSpoken(res(card), card.bp, card.real, prof, regFor(card)), prof); }

      /* Got it or Again. Again puts the card back at the end of this run;
       * in Say it a card comes back once. */
      function answer(card, good) {
        if (!(card.key in st.first)) st.first[card.key] = good;
        if (!good && (st.mode === "flip" || !st.back[card.key])) {
          st.back[card.key] = true;
          st.queue.push(card);
        }
        S.stop(); S.stopListening();
        st.idx++; st.flipped = false; st.attempt = null;
        if (st.idx >= st.queue.length) st.done = true;
        render();
      }

      function listen(done) {
        if (st.listening) { S.stopListening(); return; }
        st.listening = true;
        render();
        S.listen(prof.locale).then(function (alts) {
          st.listening = false;
          if (U.alive(run)) done(alts);
        }, function (e) {
          st.listening = false;
          var c = e && e.error;
          U.toast(c === "no-speech" ? "Nothing heard. Tap Speak, then talk." :
            c === "not-allowed" || c === "service-not-allowed" ? "The microphone is blocked for this site. Type your answer instead." :
            "Speech recognition did not work here. Type your answer instead.");
          if (U.alive(run)) render();
        });
      }

      function answerControls(onSaid) {
        var box = el('<div class="answer"></div>');
        if (S.canListen) {
          var mic = el('<button type="button" class="btn primary mic' + (st.listening ? " on" : "") + '">' +
            (st.listening ? "● Listening… tap to stop" : "🎤 Speak") + "</button>");
          mic.onclick = function () { listen(onSaid); };
          box.appendChild(mic);
        }
        var form = el('<form class="typed"><input type="text" lang="' + esc(code) + '" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="' +
          esc(prof.romanization ? "Type in " + prof.script + " or in romanization" : "Type your answer") + '" aria-label="Type your answer"><button type="submit" class="btn">Check</button></form>');
        form.onsubmit = function (e) {
          e.preventDefault();
          var v = $("input", form).value.trim();
          if (v) onSaid([v]);
        };
        box.appendChild(form);
        return box;
      }

      function marked(a) {
        if (!a.units) return "";
        return '<div class="marked' + (a.by === "rom" ? " rom" : "") + '" lang="' + (a.by === "rom" ? "en" : esc(code)) + '">' + a.units.map(function (u) {
          return '<span class="m-' + u.mark + '">' + esc(u.text) + "</span>" + esc(u.space);
        }).join("") + "</div>";
      }

      function head() {
        var h = el('<header class="solohead"><div class="titlebar">' +
          U.crumbs([{ label: "Home", href: "#" }, { label: prof.name, href: "#" + code }, { label: "Review" }]) + "</div></header>");
        h.appendChild(U.buildToolbar(prof, whole, st.reg, {
          rerender: render,
          onRegister: function (reg) { st.reg = reg; st.attempt = null; render(); }
        }));
        return h;
      }

      function controls() {
        var picker = '<label class="small">Stages 1 to <select id="upto">' + have.map(function (n) {
          return '<option value="' + n + '"' + (n === upto ? " selected" : "") + ">" + n + "</option>";
        }).join("") + "</select></label>";
        var modes = '<div class="seg" role="group" aria-label="How to review">' +
          [["flip", "Flip"], ["say", "Say it"]].map(function (m) {
            return '<button type="button" data-mode="' + m[0] + '" aria-pressed="' + (st.mode === m[0]) + '">' + m[1] + "</button>";
          }).join("") + "</div>";
        return '<div class="review-controls">' + modes + picker + '<span class="small">' + cards.length + " cards</span></div>";
      }

      function front(card) {
        var r = regFor(card), fell = r !== st.reg;
        return '<div class="rv-front"><span class="kind">' + esc(U.kindLabel(card.item)) + "</span>" +
          (card.item.extra ? '<span class="also">Also useful</span>' : "") +
          '<div class="cue">' + esc(card.en) + "</div>" +
          '<div class="rv-source">Stage ' + card.stages.map(esc).join("; Stage ") +
          (fell ? ' · <span lang="' + esc(code) + '">' + esc(labels[r]) + "</span> form (this scenario has no " +
            '<span lang="' + esc(code) + '">' + esc(labels[st.reg]) + "</span>)" : "") + "</div></div>";
      }

      function backHtml(card) {
        return [card].concat(card.others).map(function (alt, i) {
          var rr = res(alt);
          return '<div class="rv-back">' + (i ? '<div class="ctx-label">Also right</div>' : "") +
            '<div class="big">' + U.target(rr, prof, {}) + "</div>" +
            U.chunkContext(rr, alt.bp, alt.real, prof, regFor(alt)) + "</div>";
        }).join("");
      }

      /* Say it: the best match over every right answer on the card. */
      function matchCard(card, said) {
        var RANK = { notquite: 0, nearly: 1, good: 2 }, best = null;
        [card].concat(card.others).forEach(function (alt) {
          var m = S.matchLine(said, byReg(alt), regFor(alt), prof, labels);
          if (!best || RANK[m.verdict] > RANK[best.verdict] || (m.verdict === best.verdict && m.score > best.score)) best = m;
        });
        return best;
      }

      function cardBody() {
        var card = st.queue[st.idx];
        var box = el('<div class="card me review-card">' + front(card) +
          (st.mode === "say" && !st.attempt ? '<p class="hint">Say the chunk.' + (/_{2,}/.test(res(card).text || "") ? " Fill the gap with any word that fits." : "") + "</p>" : "") +
          '<div class="answer-slot"></div><div class="result"></div>' +
          (st.flipped || st.attempt ? backHtml(card) : "") +
          '<div class="actions more"></div></div>');
        var more = $(".more", box);
        function btn(label, fn, primary) {
          var b = el('<button type="button" class="btn' + (primary ? " primary" : "") + '">' + label + "</button>");
          b.onclick = fn;
          more.appendChild(b);
        }
        if (st.mode === "flip") {
          if (!st.flipped) btn("Flip", function () { st.flipped = true; render(); play(card); }, true);
          else {
            if (hasVoice()) btn("▶ Play", function () { play(card); });
            btn("Again", function () { answer(card, false); });
            btn("Got it →", function () { answer(card, true); }, true);
          }
        } else if (!st.attempt) {
          $(".answer-slot", box).appendChild(answerControls(function (alts) {
            var m = matchCard(card, alts);
            m.said = alts[0];
            st.attempt = m;
            render();
            if (m.verdict === "good") play(card);
          }));
          btn("Show answer", function () { st.attempt = { verdict: "notquite", shown: true }; render(); play(card); });
        } else {
          var a = st.attempt;
          if (!a.shown) {
            $(".result", box).innerHTML = '<div class="verdict v-' + a.verdict + '"><b>' + VERDICT[a.verdict] + "</b>" +
              (a.wrongRegister ? ' · That was the <span lang="' + esc(code) + '">' + esc(a.label) + "</span> form." : " " + Math.round(a.score * 100) + "%") +
              "</div>" + marked(a) + '<div class="heard">Heard: <span lang="' + esc(code) + '">' + esc(a.said) + "</span></div>";
          }
          if (hasVoice()) btn("▶ Play", function () { play(card); });
          btn("Next →", function () { answer(card, a.verdict === "good"); }, true);
        }
        return box;
      }

      function endBody() {
        var firsts = Object.keys(st.first), good = firsts.filter(function (k) { return st.first[k]; }).length;
        var came = [];
        st.queue.forEach(function (c) { if (st.back[c.key] && came.indexOf(c) === -1) came.push(c); });
        var body = el('<section class="wrap solo"><h1>Run done</h1><ul class="summary"><li><b>' + good + " of " + firsts.length + "</b> first time</li></ul>" +
          (came.length ? '<h3>Came back</h3><ul class="phrases">' + came.map(function (c) {
            return "<li>" + U.target(res(c), prof, { en: c.en }) + "</li>";
          }).join("") + "</ul>" : "") +
          '<p class="hint">Nothing is saved.</p><div class="actions"><button type="button" class="btn primary" id="more">Another ' + Math.min(RUN, cards.length) + "</button>" +
          '<a class="btn" href="#' + esc(code) + '">All scenarios</a></div></section>');
        $("#more", body).onclick = function () { deal(); render(); };
        return body;
      }

      function render() {
        if (!U.alive(run)) return;
        document.body.className = "solomode reviewmode";
        $app.innerHTML = "";
        $app.appendChild(head());
        if (st.done) {
          $app.appendChild(endBody());
        } else {
          var body = el('<section class="wrap solo"><h1>Review</h1>' + controls() +
            '<div class="counter">Card ' + (st.idx + 1) + " of " + st.queue.length + "</div></section>");
          body.appendChild(cardBody());
          $app.appendChild(body);
          $all("[data-mode]", body).forEach(function (b) {
            b.onclick = function () { st.mode = b.getAttribute("data-mode"); deal(); render(); };
          });
          $("#upto", body).onchange = function () { location.hash = "#" + code + "/review/" + this.value; };
        }
        /* Keys (spec §4.7): Space or Enter flips, the right arrow moves on, P plays. */
        U.page.keys = st.done ? null : {
          " ": function () { if (st.mode === "flip" && !st.flipped) { st.flipped = true; render(); play(st.queue[st.idx]); } },
          Enter: function () { if (st.mode === "flip" && !st.flipped) { st.flipped = true; render(); play(st.queue[st.idx]); } },
          ArrowRight: function () {
            if (st.mode === "flip" && st.flipped) answer(st.queue[st.idx], true);
            else if (st.mode === "say" && st.attempt) answer(st.queue[st.idx], st.attempt.verdict === "good");
          },
          p: function () { play(st.queue[st.idx]); }, P: function () { play(st.queue[st.idx]); }
        };
      }

      S.onVoices(function () {
        if (!U.alive(run)) return;
        $all(".toolbar .voice select").forEach(function (sel) { U.fillVoices(sel, prof); });
      });
      deal();
      render();
    }
  }

  window.SpeakReview = { start: start };
})();
