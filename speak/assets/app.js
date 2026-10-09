/* Speak: screens and router. Hand-written, no dependencies.
 *
 * Routes (spec §4):
 *   #                     home: pick a language
 *   #<lang>               ladder
 *   #<lang>/profile       language profile
 *   #<lang>/<id>/class    class mode (shared screen)
 *   #<lang>/<id>/solo     solo mode (M2)
 *   #<lang>/<id>/script   printable script view
 *
 * localStorage keys start with "sp.v1." (spec §6). Nothing else is stored.
 */
(function () {
  "use strict";

  var C = window.SpeakContent;
  var S = window.SpeakSpeech;
  var PREFIX = "sp.v1.";
  var $app = document.getElementById("app");

  /* ---------- storage ---------- */

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function save(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* blocked: carry on */ }
  }

  var settings = Object.assign({ rom: true, en: true, rate: 0.9, cueOnly: false }, load("settings", {}));
  function saveSettings() { save("settings", settings); }

  /* ---------- helpers ---------- */

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    if (!t) { t = el('<div id="toast" role="status" aria-live="polite"></div>'); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 4500);
  }

  function statusBadge(real) {
    var r = real.review || {};
    if (r.status === "verified") {
      return '<span class="badge verified">Verified by ' + esc(r.by) + ", " + esc(r.date) + "</span>";
    }
    return '<span class="badge draft" title="Drafted by Claude. Not yet checked by a native speaker.">Draft · not reviewed</span>';
  }

  /* Breadcrumb trail for scenario pages, plus links to the other modes. */
  var MODES = [{ id: "class", label: "Class" }, { id: "solo", label: "Solo" }, { id: "script", label: "Script" }];
  function scenarioTrail(prof, title, code, id, mode) {
    return '<div class="trail">' +
      crumbs([{ label: "Home", href: "#" }, { label: prof.name, href: "#" + code }, { label: title }]) +
      '<span class="modes" role="group" aria-label="Mode">' + MODES.map(function (m) {
        return '<a href="#' + esc(code) + "/" + esc(id) + "/" + m.id + '"' + (m.id === mode ? ' aria-current="page"' : "") + ">" + m.label + "</a>";
      }).join("") + "</span></div>";
  }

  function crumbs(parts) {
    return '<nav class="crumbs" aria-label="Breadcrumb">' + parts.map(function (p, i) {
      return i < parts.length - 1 && p.href ? '<a href="' + p.href + '">' + esc(p.label) + "</a>" : "<span>" + esc(p.label) + "</span>";
    }).join('<span class="sep">/</span>') + "</nav>";
  }

  /* Target text block: text (or variants), romanization, English. */
  function target(res, prof, opts) {
    opts = opts || {};
    var vals = opts.vals || {};
    var showRom = settings.rom && prof.romanization;
    var forms = res.variants && res.variants.length ? res.variants : [{ text: res.text, rom: res.rom }];
    var html = forms.map(function (f) {
      return '<div class="form">' +
        (f.label ? '<span class="vlabel">' + esc(f.label) + "</span>" : "") +
        '<div class="tl" lang="' + esc(prof.code) + '">' + esc(C.fill(f.text, vals.text)) + "</div>" +
        (showRom && f.rom ? '<div class="rom">' + esc(C.fill(f.rom, vals.rom)) + "</div>" : "") +
        "</div>";
    }).join("");
    if (opts.en && settings.en) html += '<div class="en">' + esc(C.fill(opts.en, vals.en)) + "</div>";
    if (opts.note && res.note) html += '<div class="note">' + esc(res.note) + "</div>";
    return html;
  }

  function firstText(res, vals) {
    var f = res.variants && res.variants.length ? res.variants[0] : res;
    return C.fill(f.text, (vals || {}).text);
  }

  /* ---------- register switch (spec §4.6) ---------- */

  function initialRegister(prof, real) {
    var info = C.registerInfo(prof, real);
    var saved = load("register." + prof.code, null);
    var ok = info.filter(function (r) { return r.allowed && r.id === saved; })[0];
    return ok ? saved : prof.defaultRegister;
  }

  function registerControl(prof, real, current, onChange) {
    var info = C.registerInfo(prof, real);
    var wrap = el('<div class="seg" role="group" aria-label="Formality"></div>');
    info.forEach(function (r) {
      var b = el('<button type="button" lang="' + esc(prof.code) + '"></button>');
      b.innerHTML = esc(r.label) + '<small>' + esc(r.en) + "</small>";
      b.setAttribute("aria-pressed", String(r.id === current));
      if (!r.allowed) {
        b.setAttribute("aria-disabled", "true");
        b.title = r.note;
        b.onclick = function () { toast(r.note); };
      } else {
        b.onclick = function () {
          if (r.id === current) return;
          save("register." + prof.code, r.id);
          onChange(r.id);
        };
      }
      wrap.appendChild(b);
    });
    return wrap;
  }

  /* ---------- site navigation (every page) ---------- */

  /* Home, then one link per language. From inside a scenario, a language link
   * keeps the scenario and mode when that language has it, and otherwise
   * goes to that language's ladder. */
  function renderNav(code, id, mode) {
    var nav = $("#sitenav");
    if (!nav) return;
    C.ladder().then(function (lad) {
      if (!lad) return;
      return Promise.all(lad.languages.map(function (L) {
        return Promise.all([C.profile(L), id ? C.realization(L, id) : Promise.resolve(null)]);
      })).then(function (rows) {
        var links = rows.map(function (r, i) {
          var L = lad.languages[i], prof = r[0];
          if (!prof) return "";
          var href = "#" + L + (id && r[1] ? "/" + id + "/" + (mode || "class") : "");
          return '<a href="' + href + '"' + (L === code ? ' aria-current="true"' : "") + ' title="' + esc(prof.name) + '">' +
            '<span lang="' + esc(L) + '">' + esc(prof.native) + '</span> <small>' + esc(prof.name) + "</small></a>";
        }).join("");
        var cur = rows[lad.languages.indexOf(code)], curProf = cur ? cur[0] : null;
        nav.innerHTML = '<a class="brand" href="#">Speak</a>' +
          '<nav class="navlinks" aria-label="Site"><a href="#"' + (!code ? ' aria-current="true"' : "") + ">Home</a>" + links + "</nav>" +
          (curProf ? '<a class="about" href="#' + esc(code) + '/profile">About ' + esc(curProf.name) + "</a>" : "");
      });
    });
  }

  /* ---------- router ---------- */

  var page = { run: 0, keys: null };

  function route() {
    S.stop();
    page.keys = null;
    var t = $("#toast");
    if (t) t.classList.remove("show");
    var run = ++page.run;
    var parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    document.body.className = "";
    renderNav(parts[0], parts[1] && parts[1] !== "profile" ? parts[1] : null, parts[2] || (parts[1] && parts[1] !== "profile" ? "class" : null));
    if (!parts.length) return home(run);
    var code = parts[0];
    if (parts[1] === "profile") return profilePage(run, code);
    if (!parts[1]) return ladderPage(run, code);
    var mode = parts[2] || "class";
    if (mode === "script") return scriptPage(run, code, parts[1]);
    if (mode === "solo") return soloPage(run, code, parts[1]);
    return classPage(run, code, parts[1]);
  }
  function alive(run) { return run === page.run; }

  document.addEventListener("keydown", function (e) {
    if (!page.keys) return;
    var tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || e.ctrlKey || e.metaKey || e.altKey) return;
    var fn = page.keys[e.key];
    if (fn) { e.preventDefault(); fn(); }
  });

  function notFound(msg) {
    $app.innerHTML = '<section class="wrap"><p class="lede">' + esc(msg) + '</p><p><a href="#">All languages</a></p></section>';
  }

  /* ---------- home ---------- */

  function home(run) {
    document.title = "Speak";
    C.ladder().then(function (lad) {
      if (!alive(run)) return;
      if (!lad) return notFound("Could not load the content. Serve the folder over http, not from file://.");
      var ids = C.ladderIds(lad);
      return Promise.all(lad.languages.map(function (code) {
        return Promise.all([C.profile(code)].concat(ids.map(function (id) { return C.realization(code, id); })));
      })).then(function (rows) {
        if (!alive(run)) return;
        var cards = rows.map(function (row, i) {
          var prof = row[0];
          if (!prof) return "";
          var reals = row.slice(1).filter(Boolean);
          var ver = reals.filter(function (r) { return (r.review || {}).status === "verified"; }).length;
          return '<li><a class="langcard" href="#' + esc(lad.languages[i]) + '">' +
            '<span class="native" lang="' + esc(prof.code) + '">' + esc(prof.native) + "</span>" +
            '<span class="lname">' + esc(prof.name) + "</span>" +
            '<span class="meta">' + reals.length + " of " + ids.length + " scenarios · " + ver + " verified</span></a></li>";
        }).join("");
        $app.innerHTML =
          '<section class="wrap">' +
          "<h1>Speak</h1>" +
          '<p class="lede">Scripted speaking practice for beginners. In class, a native speaker runs each scenario on one shared screen and corrects you as you speak. On your own, the browser plays your partner.</p>' +
          '<ol class="langs">' + cards + "</ol>" +
          "</section>";
      });
    });
  }

  /* ---------- ladder ---------- */

  function ladderPage(run, code) {
    Promise.all([C.ladder(), C.profile(code)]).then(function (r) {
      if (!alive(run)) return;
      var lad = r[0], prof = r[1];
      if (!lad || !prof) return notFound("No such language.");
      document.title = prof.name + " · Speak";
      var ids = C.ladderIds(lad);
      return Promise.all(ids.map(function (id) {
        return Promise.all([C.blueprint(id), C.realization(code, id)]);
      })).then(function (pairs) {
        if (!alive(run)) return;
        var by = {};
        ids.forEach(function (id, i) { by[id] = pairs[i]; });
        var stages = lad.stages.map(function (st) {
          var items = st.scenarios.length ? st.scenarios.map(function (id) {
            var bp = by[id][0], real = by[id][1];
            var title = (bp && bp.title) || (real && real.title) || id;
            var goal = (bp && bp.goal) || (real && real.goal) || "";
            if (!real) {
              return '<div class="scen off"><div class="stitle">' + esc(title) + '</div><div class="sgoal">' + esc(goal) +
                '</div><div class="smeta">Not yet in ' + esc(prof.name) + "</div></div>";
            }
            var base = "#" + code + "/" + id + "/";
            return '<div class="scen"><div class="stitle">' + esc(title) + "</div>" +
              '<div class="sgoal">' + esc(goal) + "</div>" +
              '<div class="smeta">' + statusBadge(real) + "</div>" +
              '<div class="actions"><a class="btn primary" href="' + base + 'class">Class</a>' +
              '<a class="btn" href="' + base + 'solo">Solo</a>' +
              '<a class="btn" href="' + base + 'script">Script</a></div></div>';
          }).join("") : '<div class="scen off"><div class="smeta">Coming later</div></div>';
          return '<li class="stage"><div class="snum"><span>' + st.stage + '</span><small>' + esc(st.level) + "</small></div>" +
            '<div class="sbody"><h2>' + esc(st.title) + "</h2>" + items + "</div></li>";
        }).join("");
        $app.innerHTML =
          '<section class="wrap">' +
          crumbs([{ label: "Home", href: "#" }, { label: prof.name }]) +
          '<h1>' + esc(prof.name) + ' <span class="native" lang="' + esc(code) + '">' + esc(prof.native) + "</span></h1>" +
          '<p class="lede">One scenario per stage. Each scenario runs in six steps: goal, vocabulary, model dialogue, role play, drill, free practice. ' +
          '<a href="#' + esc(code) + '/profile">How ' + esc(prof.name) + " works in this app</a>.</p>" +
          '<ol class="ladder">' + stages + "</ol></section>";
      });
    });
  }

  /* ---------- language profile ---------- */

  function profilePage(run, code) {
    C.profile(code).then(function (prof) {
      if (!alive(run)) return;
      if (!prof) return notFound("No such language.");
      document.title = prof.name + " profile · Speak";
      var p = prof.profile || {};
      var rows = [["Formality", p.formality], ["Script", p.script], ["Question words", p.questionWords],
        ["Agreement", p.agreement], ["Verbs", p.conjugation], ["Word order", p.wordOrder]];
      var regs = prof.registers.map(function (r) {
        return "<li><b lang=\"" + esc(code) + "\">" + esc(r.label) + "</b> " + esc(r.en) + (r.id === prof.defaultRegister ? " (default)" : "") + "</li>";
      }).join("");
      var chart = prof.romanization && prof.romanization.chart ? '<div class="chart">' + prof.romanization.chart.map(function (g) {
        return '<section class="cgroup' + (g.wide ? " wide" : "") + '"><h3><span lang="' + esc(code) + '">' + esc(g.title) + "</span> · " + esc(g.en) + "</h3>" +
          '<div class="letters">' + g.letters.map(function (l) {
            return '<div class="lt"><span class="dev" lang="' + esc(code) + '">' + esc(l[0]) + '</span><span class="r">' + esc(l[1]) + "</span></div>";
          }).join("") + "</div>" + (g.note ? '<p class="cnote">' + esc(g.note) + "</p>" : "") + "</section>";
      }).join("") + "</div>" : "";
      var rom = prof.romanization ? "<h2>Romanization: " + esc(prof.romanization.name) + "</h2>" + chart + "<h3>Rules</h3><ul>" +
        (prof.romanization.rules || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" : "";
      $app.innerHTML = '<section class="wrap">' +
        crumbs([{ label: "Home", href: "#" }, { label: prof.name, href: "#" + code }, { label: "About " + prof.name }]) +
        "<h1>" + esc(prof.name) + " in this app</h1>" +
        '<table class="kv">' + rows.map(function (r) { return "<tr><th>" + esc(r[0]) + "</th><td lang=\"" + esc(code) + "\">" + esc(r[1] || "") + "</td></tr>"; }).join("") + "</table>" +
        "<h2>Levels of \"you\"</h2><ul class=\"regs\">" + regs + "</ul>" + rom +
        "</section>";
    });
  }

  /* ---------- solo (M2) ---------- */

  function soloPage(run, code, id) {
    C.scenario(code, id).then(function (sc) {
      if (!alive(run)) return;
      if (!sc) return notFound("This scenario is not available in this language yet.");
      soloPlaceholder(code, id, sc);
    });
  }
  function soloPlaceholder(code, id, sc) {
    document.title = "Solo · " + sc.blueprint.title + " · Speak";
    $app.innerHTML = '<section class="wrap">' +
      scenarioTrail(sc.profile, sc.blueprint.title, code, id, "solo") +
      '<h1>Solo practice</h1><p class="lede">Solo mode, with the browser as your partner and speech checking, arrives in the next milestone (M2). ' +
      'For now, use <a href="#' + esc(code) + "/" + esc(id) + '/class">class mode</a> or the <a href="#' + esc(code) + "/" + esc(id) + '/script">script view</a>.</p></section>';
  }

  /* ---------- class mode (spec §4.2) ---------- */

  var STEPS = [
    { id: "goal", label: "Goal" },
    { id: "vocab", label: "Vocabulary" },
    { id: "dialogue", label: "Model dialogue" },
    { id: "roleplay", label: "Role play" },
    { id: "drill", label: "Drill" },
    { id: "free", label: "Free practice" }
  ];

  /* Pairing rule: consecutive learners pair up and each pair runs twice with
   * roles swapped. A learner left over pairs with the native speaker. */
  function buildRuns(names, native) {
    var learners = names.filter(function (n) { return n !== native; });
    var generic = learners.length === 0;
    var pairs = [];
    if (generic) pairs = [["Speaker A", "Speaker B"]];
    else if (learners.length === 1) pairs = [[learners[0], native || "Partner"]];
    else {
      for (var i = 0; i + 1 < learners.length; i += 2) pairs.push([learners[i], learners[i + 1]]);
      if (learners.length % 2) pairs.push([learners[learners.length - 1], native || learners[0]]);
    }
    var runs = [];
    pairs.forEach(function (p) { runs.push({ A: p[0], B: p[1] }); runs.push({ A: p[1], B: p[0] }); });
    return { learners: generic ? ["Speaker A", "Speaker B"] : learners, runs: runs, generic: generic };
  }

  function classPage(run, code, id) {
    C.scenario(code, id).then(function (sc) {
      if (!alive(run)) return;
      if (!sc) return notFound("This scenario is not available in this language yet.");
      startClass(run, code, id, sc);
    });
  }

  function startClass(run, code, id, sc) {
    var prof = sc.profile, bp = sc.blueprint, real = sc.real;
    document.title = bp.title + " · " + prof.name + " · Speak";
    var st = { reg: initialRegister(prof, real), step: 0, idx: 0, changed: {}, roster: null, playText: "" };

    /* Setup: names and the native speaker, remembered on this device. */
    function setup() {
      var roster = load("roster", { names: [], native: "" });
      $app.innerHTML = '<section class="wrap">' +
        scenarioTrail(prof, bp.title, code, id, "class") +
        "<h1>" + esc(bp.title) + "</h1>" +
        '<p class="lede">' + esc(bp.goal) + " " + statusBadge(real) + "</p>" +
        '<form class="setup" id="setup">' +
        '<label for="names">Who is here? One name per line. Leave it empty to use Speaker A and Speaker B.</label>' +
        '<textarea id="names" rows="6" spellcheck="false">' + esc(roster.names.join("\n")) + "</textarea>" +
        '<label for="native">Native speaker (corrects, and partners a learner left without one)</label>' +
        '<select id="native"></select>' +
        '<div class="actions"><button class="btn primary" type="submit">Start</button>' +
        '<a class="btn" href="#' + esc(code) + "/" + esc(id) + '/script">Script view</a></div>' +
        "</form></section>";
      var $names = $("#names"), $native = $("#native");
      function fillNative() {
        var names = $names.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var keep = $native.value || roster.native;
        $native.innerHTML = '<option value="">Nobody / not here</option>' + names.map(function (n) {
          return "<option" + (n === keep ? " selected" : "") + ">" + esc(n) + "</option>";
        }).join("");
      }
      fillNative();
      $names.addEventListener("input", fillNative);
      $("#setup").onsubmit = function (e) {
        e.preventDefault();
        var names = $names.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
        var r = { names: names, native: $native.value };
        save("roster", r);
        st.roster = buildRuns(names, r.native);
        st.step = 0; st.idx = 0;
        render();
      };
      page.keys = null;
    }

    /* ----- drill items ----- */
    function drillItems() {
      var slot = bp.drill.slot, def = bp.slots[slot], people = st.roster.learners, items = [];
      if (def.kind === "set") {
        var vals = (real.slotValues || {})[slot] || [];
        var n = Math.max(vals.length, people.length);
        for (var i = 0; i < n; i++) items.push({ person: people[i % people.length], value: vals[i % vals.length] });
      } else {
        people.forEach(function (p) {
          items.push({ person: p, value: slot === "name" && !st.roster.generic ? { en: p, text: p, rom: p } : null });
        });
      }
      return items;
    }

    /* Slot values for a line: names for personal "name", a blank for other
     * personal slots, and a value from the list for set slots. */
    function slotVals(speaker, setIndex, override) {
      var v = { text: {}, rom: {}, en: {} };
      Object.keys(bp.slots || {}).forEach(function (s) {
        var def = bp.slots[s];
        if (override && override.slot === s) {
          var o = override.value;
          v.text[s] = o ? o.text : "___";
          v.rom[s] = o ? (o.rom || o.text) : "___";
          v.en[s] = o ? o.en : "(" + def.cue + ")";
        } else if (def.kind === "set") {
          var list = (real.slotValues || {})[s] || [];
          var val = list[setIndex % Math.max(list.length, 1)];
          v.text[s] = val ? val.text : "___";
          v.rom[s] = val ? (val.rom || val.text) : "___";
          v.en[s] = val ? val.en : "(" + def.cue + ")";
        } else if (s === "name" && speaker && !st.roster.generic) {
          v.text[s] = v.rom[s] = v.en[s] = speaker;
        } else {
          v.text[s] = v.rom[s] = "___";
          v.en[s] = "(" + def.cue + ")";
        }
      });
      return v;
    }

    function res(item) { return C.resolve(item, st.reg, prof.defaultRegister); }

    function count(stepId) {
      switch (stepId) {
        case "vocab": return bp.vocab.length;
        case "dialogue": return bp.lines.length;
        case "roleplay": return st.roster.runs.length * bp.lines.length;
        case "drill": return drillItems().length;
        default: return 1;
      }
    }

    function go(step, idx) {
      st.step = step; st.idx = idx; st.changed = {};
      S.stop();
      render();
    }
    function next() {
      if (st.step >= STEPS.length) return;
      if (st.idx < count(STEPS[st.step].id) - 1) go(st.step, st.idx + 1);
      else go(st.step + 1, 0);
    }
    function back() {
      if (st.step >= STEPS.length) return go(STEPS.length - 1, 0);
      if (st.idx > 0) go(st.step, st.idx - 1);
      else if (st.step > 0) go(st.step - 1, count(STEPS[st.step - 1].id) - 1);
    }
    function play() {
      if (st.playText) S.speak(st.playText, prof.locale, { rate: settings.rate, voiceName: load("voice." + code, null) });
    }

    /* ----- toolbar ----- */
    function toolbar() {
      var bar = el('<div class="toolbar"></div>');
      bar.appendChild(registerControl(prof, real, st.reg, function (reg) {
        var before = snapshot();
        st.reg = reg;
        render();
        var after = snapshot();
        Object.keys(after).forEach(function (k) { if (before[k] !== undefined && before[k] !== after[k]) st.changed[k] = true; });
        markChanged();
      }));
      var toggles = el('<div class="toggles"></div>');
      if (prof.romanization) toggles.appendChild(toggle("rom", "Romanization"));
      toggles.appendChild(toggle("en", "English"));
      toggles.appendChild(toggle("cueOnly", "Cue only"));
      var rate = el('<label class="small">Speed <select>' + [0.7, 0.8, 0.9, 1].map(function (r) {
        return '<option value="' + r + '"' + (settings.rate === r ? " selected" : "") + ">" + (r === 1 ? "1×" : r + "×") + "</option>";
      }).join("") + "</select></label>");
      $("select", rate).onchange = function () { settings.rate = parseFloat(this.value); saveSettings(); };
      toggles.appendChild(rate);
      var voice = el('<label class="small voice">Voice <select></select></label>');
      fillVoices($("select", voice));
      $("select", voice).onchange = function () { save("voice." + code, this.value); };
      toggles.appendChild(voice);
      bar.appendChild(toggles);
      return bar;
    }
    function toggle(key, label) {
      var t = el('<label class="small"><input type="checkbox"' + (settings[key] ? " checked" : "") + "> " + esc(label) + "</label>");
      $("input", t).onchange = function () { settings[key] = this.checked; saveSettings(); render(); };
      return t;
    }
    function fillVoices(sel) {
      var list = S.voicesFor(prof.locale), chosen = load("voice." + code, null);
      if (!S.available) { sel.innerHTML = "<option>No speech in this browser</option>"; sel.disabled = true; return; }
      if (!list.length) {
        sel.innerHTML = "<option>No " + esc(prof.name) + " voice</option>";
        sel.disabled = true;
        sel.title = "Add a " + prof.name + " voice in your system's speech or language settings.";
        return;
      }
      sel.disabled = false;
      sel.innerHTML = list.map(function (v) { return "<option" + (v.name === chosen ? " selected" : "") + ">" + esc(v.name) + "</option>"; }).join("");
    }

    /* ----- changed-line marker ----- */
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

    /* ----- step bodies ----- */
    function bodyGoal() {
      var runs = st.roster.runs.map(function (r, i) {
        return "<li>Run " + (i + 1) + ": <b>" + esc(r.A) + "</b> is A, <b>" + esc(r.B) + "</b> is B</li>";
      }).join("");
      var notes = (real.notes || []).map(function (n) { return '<li lang="' + esc(code) + '">' + esc(n) + "</li>"; }).join("");
      st.playText = "";
      return '<div class="goal">' + esc(bp.goal) + "</div>" +
        '<div class="cols"><div><h3>Roles</h3><ul><li><b>A</b>: ' + esc(bp.roles.A) + "</li><li><b>B</b>: " + esc(bp.roles.B) + "</li></ul>" +
        "<h3>Role play order</h3><ol>" + runs + "</ol></div>" +
        (notes ? "<div><h3>In " + esc(prof.name) + "</h3><ul class=\"notes\">" + notes + "</ul></div>" : "") + "</div>";
    }

    function bodyVocab() {
      var v = bp.vocab[st.idx], r = res(real.vocab[v.id]);
      st.playText = firstText(r);
      return '<div class="counter">' + (st.idx + 1) + " / " + bp.vocab.length + "</div>" +
        '<div class="big" data-key="v-' + esc(v.id) + '">' + target(r, prof, { en: v.en }) + "</div>" +
        playButton() + '<p class="hint">The native speaker says it. Everyone repeats.</p>';
    }

    function lineRow(line, i, opts) {
      var r = res(real.lines[line.id]);
      var vals = slotVals(opts.run ? opts.run[line.role] : null, opts.setIndex || 0);
      var who = opts.run ? esc(opts.run[line.role]) + " (" + line.role + ")" : line.role;
      var hideTarget = opts.cueOnly;
      return '<li class="line' + (i === opts.current ? " current" : "") + '" data-key="l-' + esc(line.id) + '">' +
        '<span class="who">' + who + "</span>" +
        '<div class="body">' + (hideTarget ? '<div class="en cue">' + esc(C.fill(line.en, vals.en)) + "</div>" :
          target(r, prof, { en: line.en, vals: vals, note: opts.notes })) + "</div></li>";
    }

    function bodyDialogue() {
      var line = bp.lines[st.idx];
      st.playText = firstText(res(real.lines[line.id]), slotVals(null, 0));
      return '<div class="counter">Line ' + (st.idx + 1) + " / " + bp.lines.length + "</div>" +
        '<ol class="dialogue">' + bp.lines.map(function (l, i) { return lineRow(l, i, { current: st.idx, notes: true }); }).join("") + "</ol>" +
        '<div class="actions">' + playButton() + '<button type="button" class="btn" id="playall">Play all</button></div>';
    }

    function bodyRoleplay() {
      var n = bp.lines.length, ri = Math.floor(st.idx / n), li = st.idx % n;
      var run = st.roster.runs[ri], line = bp.lines[li];
      var vals = slotVals(run[line.role], ri);
      var r = res(real.lines[line.id]);
      st.playText = firstText(r, vals);
      var cue = settings.cueOnly;
      return '<div class="counter">Run ' + (ri + 1) + " / " + st.roster.runs.length + " · line " + (li + 1) + " / " + n + "</div>" +
        '<div class="pair"><span class="role a">A: ' + esc(run.A) + '</span><span class="role b">B: ' + esc(run.B) + "</span></div>" +
        '<div class="speaker">' + esc(run[line.role]) + " says:</div>" +
        '<div class="big" data-key="rp-' + esc(line.id) + '">' + (cue ? '<div class="tl en-cue">' + esc(C.fill(line.en, vals.en)) + "</div>" :
          target(r, prof, { en: line.en, vals: vals })) + "</div>" +
        playButton() +
        '<ol class="dialogue small">' + bp.lines.map(function (l, i) {
          return lineRow(l, i, { current: li, run: run, setIndex: ri, cueOnly: true });
        }).join("") + "</ol>";
    }

    function bodyDrill() {
      var items = drillItems(), it = items[st.idx], slot = bp.drill.slot;
      var lines = bp.lines.filter(function (l) { return C.slotsIn(l.en).indexOf(slot) !== -1; });
      var override = { slot: slot, value: it.value };
      var cue = settings.cueOnly;
      var blocks = lines.map(function (l) {
        var vals = slotVals(it.person, 0, override), r = res(real.lines[l.id]);
        return '<div class="big drill-line" data-key="d-' + esc(l.id) + '">' + (cue ? '<div class="tl en-cue">' + esc(C.fill(l.en, vals.en)) + "</div>" :
          target(r, prof, { en: l.en, vals: vals })) + "</div>";
      }).join("");
      var first = lines[0];
      st.playText = first ? firstText(res(real.lines[first.id]), slotVals(it.person, 0, override)) : "";
      var cueText = bp.slots[slot].kind === "personal" ? bp.slots[slot].cue : (it.value ? it.value.en : bp.slots[slot].cue);
      return '<div class="counter">' + (st.idx + 1) + " / " + items.length + "</div>" +
        '<p class="instruction">' + esc(bp.drill.instruction) + "</p>" +
        '<div class="turn">Turn: <b>' + esc(it.person) + '</b> · <span class="cueword">' + esc(cueText) + "</span></div>" +
        blocks + playButton();
    }

    function bodyFree() {
      st.playText = "";
      var targets = ((bp.free || {}).targets || []).map(function (t) {
        var r = res(((real.free || {}).targets || {})[t.id] || {});
        return '<li data-key="f-' + esc(t.id) + '">' + target(r, prof, { en: t.en }) + "</li>";
      }).join("");
      var vocab = bp.vocab.map(function (v) {
        return '<li data-key="fv-' + esc(v.id) + '">' + target(res(real.vocab[v.id]), prof, { en: v.en }) + "</li>";
      }).join("");
      return '<div class="goal">' + esc(bp.free.prompt) + "</div>" +
        '<p class="hint">No script and no timer. The native speaker listens, and notes errors for afterwards.</p>' +
        '<div class="cols"><div><h3>Phrases to use</h3><ul class="phrases">' + targets + "</ul></div>" +
        "<div><h3>Vocabulary</h3><ul class=\"phrases\">" + vocab + "</ul></div></div>";
    }

    function bodyFinish() {
      st.playText = "";
      return '<div class="goal">Done.</div><p class="lede">Run it again in another formality, or move on to the next scenario.</p>' +
        '<div class="actions"><button type="button" class="btn primary" id="again">Run again</button>' +
        '<a class="btn" href="#' + esc(code) + '">All scenarios</a>' +
        '<a class="btn" href="#' + esc(code) + "/" + esc(id) + '/script">Script view</a></div>';
    }

    function playButton() {
      return S.available ? '<button type="button" class="btn play" id="play" title="Play (P)">▶ Play</button>' : "";
    }

    /* ----- render ----- */
    function render() {
      document.body.className = "classmode";
      var done = st.step >= STEPS.length;
      var stepId = done ? "finish" : STEPS[st.step].id;
      var body = { goal: bodyGoal, vocab: bodyVocab, dialogue: bodyDialogue, roleplay: bodyRoleplay, drill: bodyDrill, free: bodyFree, finish: bodyFinish }[stepId]();
      var tabs = STEPS.map(function (s, i) {
        return '<button type="button" class="tab" data-step="' + i + '"' + (i === st.step ? ' aria-current="step"' : "") + ">" + (i + 1) + ". " + esc(s.label) + "</button>";
      }).join("");
      $app.innerHTML = "";
      var head = el('<header class="classhead"><div class="titlebar">' +
        scenarioTrail(prof, bp.title, code, id, "class") +
        statusBadge(real) +
        '<button type="button" class="btn small" id="names">Names</button></div></header>');
      head.appendChild(toolbar());
      head.appendChild(el('<nav class="tabs" aria-label="Steps">' + tabs + "</nav>"));
      $app.appendChild(head);
      $app.appendChild(el('<section class="stepbody step-' + stepId + '">' + body + "</section>"));
      if (!done) {
        $app.appendChild(el('<footer class="pager"><button type="button" class="btn" id="back">← Back</button>' +
          '<span class="where">' + esc(STEPS[st.step].label) + "</span>" +
          '<button type="button" class="btn primary" id="next">' + (st.step === STEPS.length - 1 ? "Done" : "Next →") + "</button></footer>"));
        $("#next").onclick = next;
        $("#back").onclick = back;
      }
      $all(".tab").forEach(function (b) { b.onclick = function () { go(parseInt(b.getAttribute("data-step"), 10), 0); }; });
      $("#names").onclick = setup;
      if ($("#play")) $("#play").onclick = play;
      if ($("#playall")) $("#playall").onclick = playAll;
      if ($("#again")) $("#again").onclick = function () { go(0, 0); };
      var cur = $(".dialogue:not(.small) .current");
      if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest" });
      markChanged();
      page.keys = {
        ArrowRight: next, PageDown: next, " ": next,
        ArrowLeft: back, PageUp: back,
        p: play, P: play
      };
    }

    function playAll() {
      var token = page.run, i = 0;
      (function step() {
        if (token !== page.run || i >= bp.lines.length) return;
        var l = bp.lines[i++];
        S.speak(firstText(res(real.lines[l.id]), slotVals(null, 0)), prof.locale, { rate: settings.rate, voiceName: load("voice." + code, null) })
          .then(function () { setTimeout(step, 400); });
      })();
    }

    S.onVoices(function () {
      if (!alive(run)) return;
      var sel = $(".toolbar .voice select");
      if (sel) fillVoices(sel);
    });
    setup();
  }

  /* ---------- script view (spec §4.4) ---------- */

  function scriptPage(run, code, id) {
    C.scenario(code, id).then(function (sc) {
      if (!alive(run)) return;
      if (!sc) return notFound("This scenario is not available in this language yet.");
      var prof = sc.profile, bp = sc.blueprint, real = sc.real;
      document.title = "Script: " + bp.title + " · " + prof.name;
      document.body.className = "scriptmode";
      var info = C.registerInfo(prof, real);
      var allowed = info.filter(function (r) { return r.allowed; });
      var regIds = allowed.map(function (r) { return r.id; });
      var hasRom = !!prof.romanization;

      function slotMark(s) {
        return esc(s).replace(/\{(\w+)\}/g, '<span class="slot">[$1]</span>');
      }
      function cell(r) {
        var forms = r.variants && r.variants.length ? r.variants : [{ text: r.text, rom: r.rom }];
        var html = forms.map(function (f) {
          return '<div class="form">' + (f.label ? '<span class="vlabel">' + esc(f.label) + "</span>" : "") +
            '<div class="tl" lang="' + esc(code) + '">' + slotMark(f.text || "") + "</div>" +
            (hasRom && f.rom ? '<div class="rom">' + slotMark(f.rom) + "</div>" : "") + "</div>";
        }).join("");
        if (r.accept && r.accept.length) html += '<div class="acc">Also accepted: ' + r.accept.map(function (a) { return '<span lang="' + esc(code) + '">' + slotMark(a) + "</span>"; }).join(" · ") + "</div>";
        if (r.note) html += '<div class="note">' + esc(r.note) + "</div>";
        return html;
      }
      function regCells(item) {
        if (C.sameInAll(item, regIds, prof.defaultRegister)) {
          return '<td colspan="' + regIds.length + '">' + cell(C.resolve(item, regIds[0], prof.defaultRegister)) + "</td>";
        }
        return regIds.map(function (rid) { return "<td>" + cell(C.resolve(item, rid, prof.defaultRegister)) + "</td>"; }).join("");
      }
      var regHead = allowed.map(function (r) { return '<th lang="' + esc(code) + '">' + esc(r.label) + " <small>" + esc(r.en) + "</small></th>"; }).join("");
      function table(head, rows) {
        return '<div class="tscroll"><table class="script"><thead><tr><th class="ck">OK</th>' + head + regHead + '<th class="fix">Correction</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
      }
      var ck = '<td class="ck"><span class="box"></span></td>', fix = '<td class="fix"></td>';

      var dialogue = table("<th>#</th><th>Role</th><th>English</th>", bp.lines.map(function (l, i) {
        return "<tr>" + ck + "<td>" + (i + 1) + "</td><td>" + l.role + "</td><td>" + slotMark(l.en) + "</td>" + regCells(real.lines[l.id]) + fix + "</tr>";
      }).join(""));
      var vocab = table("<th>English</th>", bp.vocab.map(function (v) {
        return "<tr>" + ck + "<td>" + esc(v.en) + "</td>" + regCells(real.vocab[v.id]) + fix + "</tr>";
      }).join(""));
      var targets = ((bp.free || {}).targets || []);
      var free = '<p class="prompt">' + esc(bp.free.prompt) + "</p>" + (targets.length ? table("<th>English</th>", targets.map(function (t) {
        return "<tr>" + ck + "<td>" + esc(t.en) + "</td>" + regCells(((real.free || {}).targets || {})[t.id]) + fix + "</tr>";
      }).join("")) : "");
      var slotTables = Object.keys(bp.slots || {}).filter(function (s) { return bp.slots[s].kind === "set"; }).map(function (s) {
        var vals = (real.slotValues || {})[s] || [];
        return "<h3>Values for [" + esc(s) + "]</h3>" +
          '<div class="tscroll"><table class="script"><thead><tr><th class="ck">OK</th><th>English</th><th>' + esc(prof.name) + '</th><th class="fix">Correction</th></tr></thead><tbody>' +
          vals.map(function (v) {
            return "<tr>" + ck + "<td>" + esc(v.en) + '</td><td><div class="tl" lang="' + esc(code) + '">' + esc(v.text) + "</div>" +
              (hasRom && v.rom ? '<div class="rom">' + esc(v.rom) + "</div>" : "") + "</td>" + fix + "</tr>";
          }).join("") + "</tbody></table></div>";
      }).join("");
      var blocked = info.filter(function (r) { return !r.allowed; }).map(function (r) {
        return '<li><b lang="' + esc(code) + '">' + esc(r.label) + "</b> (" + esc(r.en) + ") not used: " + esc(r.note) + "</li>";
      }).join("");
      var notes = (real.notes || []).map(function (n) { return '<li lang="' + esc(code) + '">' + esc(n) + "</li>"; }).join("");
      var rv = real.review || {};

      $app.innerHTML = '<section class="script-page">' +
        '<div class="noprint">' + scenarioTrail(prof, bp.title, code, id, "script") +
        '<p class="actions"><button type="button" class="btn primary" id="print">Print or save as PDF</button>' +
        '<a class="btn" href="#' + esc(code) + "/" + esc(id) + '/class">Class mode</a></p></div>' +
        "<h1>" + esc(bp.title) + ' <span class="lang">' + esc(prof.name) + " · " + esc(prof.native) + "</span></h1>" +
        '<p class="goalline">' + esc(bp.goal) + "</p>" +
        '<div class="reviewbox"><div>Status: <b>' + esc(rv.status || "draft") + "</b>" + (rv.by ? " · " + esc(rv.by) + " · " + esc(rv.date) : "") + "</div>" +
        "<div>Reviewed by: <span class=\"blank\"></span></div><div>Date: <span class=\"blank short\"></span></div></div>" +
        '<p class="howto">Please check every line. Tick OK, or write the correct form in the Correction column. ' +
        (hasRom ? "The romanization follows the rules on the " + esc(prof.name) + " profile page. " : "") +
        "[slot] marks a word the speaker fills in.</p>" +
        "<h2>Model dialogue</h2>" + dialogue +
        "<h2>Vocabulary</h2>" + vocab +
        (slotTables ? "<h2>Drill values</h2>" + slotTables : "") +
        "<h2>Free practice</h2>" + free +
        (notes ? "<h2>Notes</h2><ul>" + notes + "</ul>" : "") +
        (blocked ? "<h2>Formality</h2><ul>" + blocked + "</ul>" : "") +
        "</section>";
      $("#print").onclick = function () { window.print(); };
    });
  }

  window.addEventListener("hashchange", route);
  route();
})();
