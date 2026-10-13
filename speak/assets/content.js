/* Speak: content loading and resolution. No DOM code.
 *
 * Reads the JSON under content/ (schema in _project/sites/speak-spec.md §3).
 * Exposes window.SpeakContent.
 */
(function () {
  "use strict";

  var cache = {};
  /* Content folder, relative to the page. The test page sets SPEAK_CONTENT_BASE. */
  var BASE = window.SPEAK_CONTENT_BASE || "content/";

  function getJSON(path) {
    if (!(path in cache)) {
      cache[path] = fetch(path, { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; });
    }
    return cache[path];
  }

  function ladder() { return getJSON(BASE + "ladder.json"); }
  function profile(code) { return getJSON(BASE + code + "/profile.json"); }
  function blueprint(id) { return getJSON(BASE + "scenarios/" + id + ".json"); }
  function realization(code, id) { return getJSON(BASE + code + "/" + id + ".json"); }

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

  /* Resolve one line, chunk or target for a register (spec §3.4).
   * Start from the base fields; a byRegister entry for a non-default
   * register replaces the fields it sets. */
  var FIELDS = ["text", "rom", "variants", "accept", "note", "choice"];
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

  /* Sample values for every slot (spec §3.8): personal slots from
   * partnerValues, set slots from slotValues[setIndex]. Missing ones stay blank.
   * Returns { text: {}, rom: {}, en: {} } for fill(). */
  function sampleValues(bp, real, setIndex) {
    var v = { text: {}, rom: {}, en: {} };
    Object.keys(bp.slots || {}).forEach(function (s) {
      var def = bp.slots[s], val = null;
      if (def.kind === "set") {
        var list = (real.slotValues || {})[s] || [];
        val = list.length ? list[(setIndex || 0) % list.length] : null;
      } else {
        val = (real.partnerValues || {})[s] || null;
      }
      if (val) { v.text[s] = val.text; v.rom[s] = val.rom || val.text; v.en[s] = val.en; }
    });
    return v;
  }

  /* ---------- gender (spec §3.10) ---------- */

  var WHO = { f: "a woman", m: "a man" };

  /* The label shown for a variant: written from speaker and listener when set,
   * otherwise its own label. */
  function variantLabel(v) {
    if (v.speaker && v.listener) return WHO[v.speaker] + " to " + WHO[v.listener];
    if (v.speaker) return "said by " + WHO[v.speaker];
    if (v.listener) return "to " + WHO[v.listener];
    return v.label || "";
  }

  function agrees(v, speaker, listener) {
    return (!v.speaker || !speaker || v.speaker === speaker) && (!v.listener || !listener || v.listener === listener);
  }

  /* Split a resolved item by the known genders ("f", "m" or null).
   * Returns { res, other }: res keeps the variants that agree, other holds the
   * ones left out (no accepts) with a message for the wrong-gender check, or null. */
  function forGender(res, speaker, listener) {
    var vs = res.variants || [];
    if (!vs.length || (!speaker && !listener)) return { res: res, other: null };
    var keep = vs.filter(function (v) { return agrees(v, speaker, listener); });
    var drop = vs.filter(function (v) { return !agrees(v, speaker, listener); });
    if (!keep.length || !drop.length) return { res: res, other: null };
    var out = {};
    Object.keys(res).forEach(function (k) { out[k] = res[k]; });
    out.variants = keep;
    out.allVariants = vs;   /* so the shown form can still be coloured against the others */
    var d = drop[0];
    var message = d.speaker && speaker && d.speaker !== speaker ?
      "That was the form " + WHO[d.speaker] + " uses." : "That was the form for speaking to " + WHO[d.listener] + ".";
    return { res: out, other: { variants: drop, text: d.text, rom: d.rom, message: message } };
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
    resolve: resolve, sameInAll: sameInAll, fill: fill, slotsIn: slotsIn, registerInfo: registerInfo,
    sampleValues: sampleValues, variantLabel: variantLabel, forGender: forGender
  };
})();
