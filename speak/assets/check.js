/* Speak: Check your device (spec §4.8). For each language: which voices the
 * device has, a test sentence, and a microphone test. Nothing is stored.
 *
 * Uses window.SpeakContent, window.SpeakSpeech and window.SpeakUI (app.js).
 * Exposes window.SpeakCheck.
 */
(function () {
  "use strict";

  var C = window.SpeakContent;
  var S = window.SpeakSpeech;

  function start(run) {
    var U = window.SpeakUI, esc = U.esc, el = U.el, $ = U.$, $all = U.$all, $app = U.app;
    document.title = "Check your device · Speak";
    document.body.className = "";

    C.ladder().then(function (lad) {
      if (!U.alive(run)) return;
      if (!lad) return U.notFound("Could not load the content. Serve the folder over http, not from file://.");
      return Promise.all(lad.languages.map(function (code) {
        return Promise.all([C.profile(code), C.scenario(code, "greetings")]);
      })).then(function (rows) {
        if (!U.alive(run)) return;
        var langs = rows.filter(function (r) { return r[0]; }).map(function (r) { return { prof: r[0], sc: r[1] }; });
        var heard = {};   /* code -> last transcript or message, for this page view only */
        var listening = null;

        /* A test sentence: greetings line 3 (my name is … what is yours?), filled
         * with the partner's name. */
        function sample(L) {
          if (!L.sc) return "";
          var bp = L.sc.blueprint, real = L.sc.real, prof = L.prof;
          var l = bp.lines.filter(function (x) { return x.id === "l3"; })[0] || bp.lines[0];
          var r = C.resolve(real.lines[l.id], prof.defaultRegister, prof.defaultRegister);
          return U.sayText(r, null, bp, real);
        }

        function voiceList(prof) {
          var list = S.voicesFor(prof.locale);
          if (!S.available) return '<p class="notice warn">This browser cannot speak. Try Chrome, Edge or Safari.</p>';
          if (!list.length) {
            return '<p class="notice warn">No ' + esc(prof.name) + " voice on this device. " +
              "Add one: Windows: Settings → Time &amp; language → Speech → Add voices. " +
              "Mac: System Settings → Accessibility → Spoken Content → System voice → Manage voices. " +
              "iPhone and iPad: Settings → Accessibility → Spoken Content → Voices. " +
              "Android: Settings → Text-to-speech → Install voice data.</p>";
          }
          var exact = list.filter(function (v) { return String(v.lang).toLowerCase().replace("_", "-") === prof.locale.toLowerCase(); }).length;
          var mark = { f: " (female)", m: " (male)" };
          return '<p class="small">' + list.length + " voice" + (list.length > 1 ? "s" : "") +
            (exact < list.length ? ", " + exact + " for " + esc(prof.locale) + " exactly" : "") + ":</p>" +
            '<ul class="voices">' + list.map(function (v) {
              var g = S.voiceGender(v.name);
              return "<li>" + esc(v.name) + ' <small>' + esc(v.lang) + (g ? mark[g] : "") + "</small></li>";
            }).join("") + "</ul>";
        }

        function card(L) {
          var prof = L.prof, h = heard[prof.code];
          var box = el('<section class="checkcard"><h2>' + esc(prof.name) + ' <span class="native" lang="' + esc(prof.code) + '">' + esc(prof.native) + "</span></h2>" +
            voiceList(prof) +
            '<div class="actions"></div>' +
            (h ? '<div class="heard ' + (h.ok ? "ok" : "warn") + '">' + (h.ok ? 'Heard: <span lang="' + esc(prof.code) + '">' + esc(h.text) + "</span>" : esc(h.text)) + "</div>" : "") +
            "</section>");
          var acts = $(".actions", box);
          ["f", "m"].forEach(function (g) {
            if (!S.voicesFor(prof.locale).length) return;
            var b = el('<button type="button" class="btn">▶ ' + (g === "f" ? "Female" : "Male") + " voice</button>");
            b.onclick = function () { U.say(sample(L), prof, g); };
            acts.appendChild(b);
          });
          if (S.canListen) {
            var on = listening === prof.code;
            var mic = el('<button type="button" class="btn primary mic' + (on ? " on" : "") + '">' + (on ? "● Listening… say something" : "🎤 Test the microphone") + "</button>");
            mic.onclick = function () {
              if (listening) { S.stopListening(); return; }
              listening = prof.code; render();
              S.listen(prof.locale).then(function (alts) {
                listening = null; heard[prof.code] = { ok: true, text: alts[0] || "" }; render();
              }, function (e) {
                listening = null;
                var c = e && e.error;
                heard[prof.code] = { ok: false, text:
                  c === "not-allowed" || c === "service-not-allowed" ? "The microphone is blocked for this site. Allow it from the address bar, then try again." :
                  c === "language-not-supported" ? "This browser cannot recognise " + prof.name + "." :
                  c === "no-speech" ? "Nothing heard. Tap the button, then speak." :
                  c === "audio-capture" ? "No microphone found." :
                  c === "network" ? "Recognition needs a network connection." : "Recognition did not work (" + (c || "unknown") + ")." };
                render();
              });
            };
            acts.appendChild(mic);
          }
          return box;
        }

        function render() {
          if (!U.alive(run)) return;
          var secure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
          var body = el('<section class="wrap check">' +
            U.crumbs([{ label: "Home", href: "#" }, { label: "Check your device" }]) +
            "<h1>Check your device</h1>" +
            '<p class="lede">Do this before class. Play a voice for each language you study, then test the microphone: say anything and see what the browser heard.</p>' +
            '<ul class="summary">' +
            "<li>Speech: <b>" + (S.available ? "yes" : "no") + "</b></li>" +
            "<li>Speech recognition: <b>" + (S.canListen ? "yes" : "no") + "</b>" + (S.canListen ? "" : ". Answers can still be typed. Chrome, Edge and Safari have it.") + "</li>" +
            (secure ? "" : '<li class="warn">This page is not on https, so the microphone may be blocked.</li>') +
            "</ul>" +
            '<p class="hint">Recognition shows whether the browser understood your words. It does not judge pronunciation or tones.</p>' +
            "</section>");
          langs.forEach(function (L) { body.appendChild(card(L)); });
          $app.innerHTML = "";
          $app.appendChild(body);
        }
        S.onVoices(function () { if (U.alive(run)) render(); });
        render();
      });
    });
  }

  window.SpeakCheck = { start: start };
})();
