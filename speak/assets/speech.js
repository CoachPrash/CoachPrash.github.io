/* Speak: speech. No DOM code.
 *
 * M1: text-to-speech only (browser speechSynthesis).
 * M2 adds recognition and matching here (spec §5.2, §5.3).
 * Exposes window.SpeakSpeech.
 */
(function () {
  "use strict";

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
      var done = false;
      function finish() { if (!done) { done = true; clearTimeout(timer); resolve(); } }
      var timer = setTimeout(finish, 3000 + t.length * 160 / u.rate);
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    });
  }

  function stop() { if (synth) synth.cancel(); }

  window.SpeakSpeech = {
    available: !!synth,
    voicesFor: voicesFor,
    hasVoices: function () { return voices.length > 0; },
    onVoices: function (fn) { listeners.push(fn); },
    speak: speak,
    stop: stop
  };
})();
