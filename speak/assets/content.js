/* Speak: content loading and resolution. No DOM code.
 *
 * Reads the JSON under content/ (schema in _project/sites/speak-spec.md §3).
 * Exposes window.SpeakContent.
 */
(function () {
  "use strict";

  var cache = {};

  function getJSON(path) {
    if (!(path in cache)) {
      cache[path] = fetch(path, { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return cache[path];
  }

  function ladder() { return getJSON("content/ladder.json"); }
  function profile(code) { return getJSON("content/" + code + "/profile.json"); }
  function blueprint(id) { return getJSON("content/scenarios/" + id + ".json"); }
  function realization(code, id) { return getJSON("content/" + code + "/" + id + ".json"); }

  /* Everything one scenario screen needs, or null if this language lacks it. */
  function scenario(code, id) {
    return Promise.all([profile(code), blueprint(id), realization(code, id)]).then(function (r) {
      if (!r[0] || !r[1] || !r[2]) return null;
      return { profile: r[0], blueprint: r[1], real: r[2] };
    });
  }

  /* Scenario ids in ladder order. */
  function ladderIds(lad) {
    var ids = [];
    (lad.stages || []).forEach(function (s) { (s.scenarios || []).forEach(function (id) { ids.push(id); }); });
    return ids;
  }

  /* Resolve one line, vocab item or target for a register (spec §3.4).
   * Start from the base fields; a byRegister entry for a non-default
   * register replaces the fields it sets. */
  var FIELDS = ["text", "rom", "variants", "accept", "note"];
  function resolve(item, register, defaultRegister) {
    var out = {};
    FIELDS.forEach(function (f) { if (item[f] !== undefined) out[f] = item[f]; });
    if (register !== defaultRegister && item.byRegister && item.byRegister[register]) {
      var over = item.byRegister[register];
      FIELDS.forEach(function (f) { if (over[f] !== undefined) out[f] = over[f]; });
    }
    return out;
  }

  /* True when every allowed register gives the same text (script view spans the columns). */
  function sameInAll(item, registers, defaultRegister) {
    var first = JSON.stringify(resolve(item, registers[0], defaultRegister));
    return registers.every(function (r) { return JSON.stringify(resolve(item, r, defaultRegister)) === first; });
  }

  /* Replace {slot} with values[slot]; unknown slots become a blank. */
  function fill(text, values) {
    if (text == null) return text;
    return String(text).replace(/\{(\w+)\}/g, function (_, name) {
      return values && values[name] != null ? values[name] : "___";
    });
  }

  function slotsIn(text) {
    var out = [], m, re = /\{(\w+)\}/g;
    while ((m = re.exec(text || ""))) out.push(m[1]);
    return out;
  }

  /* Registers the realization allows, as profile entries, plus the blocked ones. */
  function registerInfo(prof, real) {
    var allowed = real.registers || [prof.defaultRegister];
    return prof.registers.map(function (r) {
      return {
        id: r.id, label: r.label, en: r.en,
        allowed: allowed.indexOf(r.id) !== -1,
        note: (real.registerNotes || {})[r.id] || ""
      };
    });
  }

  window.SpeakContent = {
    ladder: ladder, profile: profile, blueprint: blueprint, realization: realization,
    scenario: scenario, ladderIds: ladderIds,
    resolve: resolve, sameInAll: sameInAll, fill: fill, slotsIn: slotsIn, registerInfo: registerInfo
  };
})();
