#!/usr/bin/env python3
"""
Validate the Speak content files (speak/content/**). Standard library only.

    python _build/check_speak.py

Prints one line per problem and exits 1 if there are any. Prints a summary and
exits 0 if the content is valid. The rules are in _project/sites/speak-spec.md §7.
Run it before every commit that touches speak/content/.
"""
import json
import pathlib
import re
import sys
import unicodedata

REPO = pathlib.Path(__file__).resolve().parent.parent
CONTENT = REPO / "speak" / "content"
SLOT = re.compile(r"\{(\w+)\}")
SCHEMA = 2
NORMALIZE_RULES = {"nukta", "chandrabindu", "ye-e", "devanagari-digits", "accents", "apostrophes", "han-punctuation"}

problems = []


def problem(where, msg):
    problems.append(f"{where}: {msg}")


def rel(path):
    return path.relative_to(REPO).as_posix()


def load(path):
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as e:
        problem(rel(path), f"cannot read JSON ({e})")
        return None
    if isinstance(data, dict) and data.get("schema") == 1:
        problem(rel(path), 'schema 1 predates chunks: rename "vocab" to "chunks" and set "schema": 2 (spec 0.8)')
    elif not isinstance(data, dict) or data.get("schema") != SCHEMA:
        problem(rel(path), f'missing "schema": {SCHEMA}')
    return data


# ---------------------------------------------------------------- chunk occurrence (spec §3.9)

WILD = "\x00gap"        # a gap in a chunk
SLOT_TOKEN = "\x00slot"  # a {slot} in a line


def choices(text):
    """'मैं ___ में रहता / रहती हूँ' -> one string per choice."""
    m = re.search(r"(\S+)\s+/\s+(\S+)", text or "")
    if not m:
        return [text or ""]
    head, tail = text[:m.start()], text[m.end():]
    return choices(head + m.group(1) + tail) + choices(head + m.group(2) + tail)


def tokens(text, mode):
    """Case folded, punctuation removed. Words, or characters for chars mode."""
    t = SLOT.sub(" " + SLOT_TOKEN + " ", text or "")
    t = re.sub(r"_{2,}", " " + WILD + " ", t)
    t = "".join(" " if unicodedata.category(c)[0] in "PS" and c != "\x00" else c for c in t.lower())
    out = []
    for w in t.split():
        if w.startswith("\x00") or mode != "chars":
            out.append(w)
        else:
            out += re.findall(r"[a-z0-9\u00c0-\u024f]+|\S", w)
    return out


def occurs(chunk, line):
    """Do the chunk's tokens appear in a row in the line? A gap matches 1 to 3
    words (1 to 4 characters in chars mode). A {slot} in the line counts as one
    word. speak/assets/speech.js locate() uses the same rule."""
    run = 4 if MODE == "chars" else 3

    def at(ci, li):
        if ci == len(chunk):
            return True
        if chunk[ci] == WILD:
            return any(at(ci + 1, li + k) for k in range(1, run + 1) if li + k <= len(line))
        return li < len(line) and line[li] == chunk[ci] and at(ci + 1, li + 1)

    return any(at(0, i) for i in range(len(line)))


def item_texts(item):
    """Every text of a line or chunk: base, variants, byRegister and their variants."""
    out = [item.get("text")] + [v.get("text") for v in item.get("variants", [])]
    for entry in item.get("byRegister", {}).values():
        out += [entry.get("text")] + [v.get("text") for v in entry.get("variants", [])]
    return [t for t in out if t]


MODE = "words"
recur = []   # (lang, chunk text, own scenario, other scenarios)


def slots_in(text):
    return set(SLOT.findall(text or ""))


# ---------------------------------------------------------------- load

ladder = load(CONTENT / "ladder.json") if (CONTENT / "ladder.json").exists() else None
if ladder is None:
    problem("speak/content/ladder.json", "missing or unreadable")
    ladder = {"stages": []}

blueprints = {}
for path in sorted((CONTENT / "scenarios").glob("*.json")):
    data = load(path)
    if data is not None:
        blueprints[path.stem] = (path, data)

languages = {}
for d in sorted(p for p in CONTENT.iterdir() if p.is_dir() and p.name != "scenarios"):
    prof_path = d / "profile.json"
    if not prof_path.exists():
        problem(rel(d), "no profile.json")
        continue
    prof = load(prof_path)
    if prof is None:
        continue
    reals = {}
    for path in sorted(d.glob("*.json")):
        if path.name == "profile.json":
            continue
        data = load(path)
        if data is not None:
            reals[path.stem] = (path, data)
    languages[d.name] = (prof_path, prof, reals)

# ---------------------------------------------------------------- blueprints

for sid, (path, bp) in blueprints.items():
    where = rel(path)
    if bp.get("id") != sid:
        problem(where, f'id "{bp.get("id")}" does not match the file name')
    for field in ("title", "goal", "roles", "lines", "chunks", "drill", "free"):
        if field not in bp:
            problem(where, f'missing "{field}"')
    lines = bp.get("lines", [])
    if not 4 <= len(lines) <= 8:
        problem(where, f"{len(lines)} lines; a dialogue has 4 to 8")
    ids = [l.get("id") for l in lines]
    if len(ids) != len(set(ids)):
        problem(where, "duplicate line ids")
    declared = set(bp.get("slots", {}))
    for name, slot in bp.get("slots", {}).items():
        if slot.get("kind") not in ("personal", "set"):
            problem(where, f'slot "{name}": kind must be "personal" or "set"')
        if not slot.get("cue"):
            problem(where, f'slot "{name}": missing "cue"')
    for l in lines:
        if l.get("role") not in ("A", "B"):
            problem(where, f'{l.get("id")}: role must be "A" or "B"')
        for s in slots_in(l.get("en")) - declared:
            problem(where, f'{l.get("id")}: slot {{{s}}} is not declared in "slots"')
    chunks = bp.get("chunks", [])
    if not 5 <= len(chunks) <= 10:
        problem(where, f"{len(chunks)} chunks; a scenario has 5 to 10")
    drill_slot = bp.get("drill", {}).get("slot")
    if drill_slot not in declared:
        problem(where, f'drill slot "{drill_slot}" is not declared in "slots"')
    if not bp.get("free", {}).get("prompt"):
        problem(where, 'free practice needs a "prompt"')
    if "minutes" in bp.get("free", {}):
        problem(where, 'free practice has no timer: remove "minutes"')

# ---------------------------------------------------------------- ladder

ladder_ids = []
for stage in ladder.get("stages", []):
    for sid in stage.get("scenarios", []):
        ladder_ids.append(sid)
        own = any(sid in reals and isinstance(reals[sid][1].get("lines"), list)
                  for _, _, reals in languages.values())
        if sid not in blueprints and not own:
            problem("speak/content/ladder.json", f'"{sid}" has no blueprint and no language-only realization')
listed = ladder.get("languages", [])
if sorted(listed) != sorted(languages):
    problem("speak/content/ladder.json", f'"languages" {listed} does not match the language folders {sorted(languages)}')
if len(ladder_ids) != len(set(ladder_ids)):
    problem("speak/content/ladder.json", "a scenario is listed twice")

# ---------------------------------------------------------------- languages

for code, (prof_path, prof, reals) in languages.items():
    pwhere = rel(prof_path)
    if prof.get("code") != code:
        problem(pwhere, f'code "{prof.get("code")}" does not match the folder')
    for field in ("name", "native", "locale", "script", "match", "registers", "defaultRegister", "profile"):
        if field not in prof:
            problem(pwhere, f'missing "{field}"')
    if prof.get("match") not in ("words", "chars"):
        problem(pwhere, 'match must be "words" or "chars"')
    if prof.get("partnerGender") not in (None, "f", "m"):
        problem(pwhere, 'partnerGender must be "f" or "m"')
    MODE = prof.get("match", "words")
    for rule in prof.get("normalize", []):
        if rule not in NORMALIZE_RULES:
            problem(pwhere, f'normalize: unknown rule "{rule}"')
    reg_ids = [r.get("id") for r in prof.get("registers", [])]
    default = prof.get("defaultRegister")
    if default not in reg_ids:
        problem(pwhere, f'defaultRegister "{default}" is not one of the registers')
    has_rom = bool(prof.get("romanization"))

    for sid, (path, r) in reals.items():
        where = rel(path)
        if r.get("scenario") != sid:
            problem(where, f'scenario "{r.get("scenario")}" does not match the file name')
        if r.get("lang") != code:
            problem(where, f'lang "{r.get("lang")}" does not match the folder')

        review = r.get("review", {})
        if review.get("status") not in ("draft", "verified"):
            problem(where, 'review.status must be "draft" or "verified"')
        if review.get("status") == "verified" and not (review.get("by") and review.get("date")):
            problem(where, 'a verified realization needs review.by and review.date')

        allowed = r.get("registers", [])
        if default not in allowed:
            problem(where, f'registers must include the default "{default}"')
        for reg in allowed:
            if reg not in reg_ids:
                problem(where, f'register "{reg}" is not in the profile')
        for reg in reg_ids:
            if reg not in allowed and reg not in r.get("registerNotes", {}):
                problem(where, f'register "{reg}" is left out without a registerNotes entry')
        non_default = [x for x in allowed if x != default]

        if sid not in blueprints:
            if not isinstance(r.get("lines"), list):
                problem(where, "no blueprint with this id, and no own lines (language-only shape)")
            continue
        bp = blueprints[sid][1]

        def forms(item):
            """The base form, its variants, each byRegister entry and its variants."""
            out = [("base", item)]
            out += [(f'variant "{v.get("label")}"', v) for v in item.get("variants", [])]
            for reg, entry in item.get("byRegister", {}).items():
                out.append((reg, entry))
                out += [(f'{reg} variant "{v.get("label")}"', v) for v in entry.get("variants", [])]
            return out

        def check_item(kind, bid, item, en, addresses_you, check_slots):
            label = f"{kind} {bid}"
            if not item.get("text"):
                problem(where, f"{label}: missing text")
            for reg in item.get("byRegister", {}):
                if reg not in non_default:
                    problem(where, f'{label}: byRegister "{reg}" is not an allowed non-default register')
            if addresses_you and not item.get("registerNeutral"):
                for reg in non_default:
                    if reg not in item.get("byRegister", {}):
                        problem(where, f'{label}: addresses "you" but has no "{reg}" form (or set registerNeutral)')
            want = slots_in(en)
            for name, form in forms(item):
                if "text" in form:
                    if has_rom and "rom" not in form:
                        problem(where, f"{label} ({name}): missing rom")
                    if check_slots:
                        for fld in ("text", "rom"):
                            if fld in form and slots_in(form[fld]) != want:
                                problem(where, f"{label} ({name}): {fld} slots {sorted(slots_in(form[fld]))} != {sorted(want)}")
                for a in form.get("accept", []):
                    # a plain string, or { "text", "rom" } so typed romanization can match it
                    if isinstance(a, dict):
                        if not a.get("text"):
                            problem(where, f"{label} ({name}): an accept object needs text")
                        if has_rom and not a.get("rom"):
                            problem(where, f"{label} ({name}): accept {a.get('text')!r} has no rom")
                        texts = [a.get("text", ""), a.get("rom", "")] if has_rom else [a.get("text", "")]
                    elif isinstance(a, str):
                        texts = [a]
                    else:
                        problem(where, f"{label} ({name}): accept entries are strings or objects")
                        continue
                    if check_slots:
                        for t in texts:
                            if t and slots_in(t) != want:
                                problem(where, f"{label} ({name}): accept slots {sorted(slots_in(t))} != {sorted(want)}")

        # lines
        bp_lines = {l["id"]: l for l in bp.get("lines", [])}
        rl = r.get("lines", {})
        for lid in bp_lines:
            if lid not in rl:
                problem(where, f"line {lid} is missing")
        for lid, item in rl.items():
            if lid not in bp_lines:
                problem(where, f"line {lid} is not in the blueprint")
                continue
            b = bp_lines[lid]
            check_item("line", lid, item, b.get("en"), b.get("addressesYou"), True)

        # gender fields on variants (spec §3.10)
        for lid, item in rl.items():
            if "sameSound" in item and (item["sameSound"] is not True or not item.get("variants")):
                problem(where, f'line {lid}: sameSound is true, and only on a line with variants')
            groups = [item.get("variants", [])] + [e.get("variants", []) for e in item.get("byRegister", {}).values()]
            for vs in groups:
                for fld in ("speaker", "listener"):
                    have = [v for v in vs if fld in v]
                    if have and len(have) != len(vs):
                        problem(where, f'line {lid}: "{fld}" is set on some variants but not all')
                    for v in have:
                        if v[fld] not in ("f", "m"):
                            problem(where, f'line {lid}: {fld} must be "f" or "m"')
                for v in vs:
                    if "speaker" not in v and "listener" not in v and not v.get("label"):
                        problem(where, f"line {lid}: a variant with no speaker or listener needs a label")

        # chunks (spec §3.9)
        bp_chunks = {v["id"]: v for v in bp.get("chunks", [])}
        rc = r.get("chunks", {})
        if set(rc) != set(bp_chunks):
            problem(where, f"chunk keys differ from the blueprint: missing {sorted(set(bp_chunks) - set(rc))}, extra {sorted(set(rc) - set(bp_chunks))}")
        line_tokens = [tokens(t, MODE) for item in rl.values() for t in item_texts(item)]
        for cid, item in rc.items():
            if cid not in bp_chunks:
                continue
            check_item("chunk", cid, item, "", bp_chunks[cid].get("addressesYou"), False)
            gap = "___" in (item.get("text") or "")
            kind = item.get("kind")
            if kind is not None and kind not in ("fixed", "frame", "collocation"):
                problem(where, f'chunk {cid}: kind must be "fixed", "frame" or "collocation"')
            if kind == "fixed" and gap:
                problem(where, f'chunk {cid}: has ___, so it is a frame, not fixed')
            if kind == "frame" and not gap:
                problem(where, f'chunk {cid}: a frame needs ___')
            if "extra" in item and item["extra"] is not True:
                problem(where, f'chunk {cid}: extra is true or left out')
            if "literal" in item and not isinstance(item["literal"], str):
                problem(where, f'chunk {cid}: literal is a string')
            cforms = [tokens(c, MODE) for t in item_texts(item) for c in choices(t)]
            if not item.get("extra") and not any(occurs(f, lt) for f in cforms for lt in line_tokens if f):
                problem(where, f'chunk {cid}: "{item.get("text")}" does not occur in the dialogue (rewrite it from a line, or set "extra": true)')
            chain = item.get("chain")
            if chain is not None:
                whole = tokens(item.get("text"), MODE)
                prev = 0
                for piece in chain:
                    pt = tokens(piece, MODE)
                    if not pt or pt != whole[-len(pt):]:
                        problem(where, f'chunk {cid}: chain piece "{piece}" is not an ending of the chunk')
                    elif len(pt) <= prev:
                        problem(where, f'chunk {cid}: chain pieces must grow in length')
                    prev = max(prev, len(pt))
            if not item.get("extra"):
                recur.append((code, sid, item.get("text"), cforms))

        # free-practice targets
        bp_targets = {t["id"]: t for t in bp.get("free", {}).get("targets", [])}
        rt = r.get("free", {}).get("targets", {})
        if set(rt) != set(bp_targets):
            problem(where, f"free targets differ from the blueprint: missing {sorted(set(bp_targets) - set(rt))}, extra {sorted(set(rt) - set(bp_targets))}")
        for tid, item in rt.items():
            if tid in bp_targets:
                check_item("free target", tid, item, "", bp_targets[tid].get("addressesYou"), False)

        # set slots
        for name, slot in bp.get("slots", {}).items():
            if slot.get("kind") != "set":
                continue
            values = r.get("slotValues", {}).get(name, [])
            if len(values) < 3:
                problem(where, f'set slot "{name}" needs at least 3 slotValues, has {len(values)}')
            for i, v in enumerate(values):
                if not v.get("en") or not v.get("text"):
                    problem(where, f'slotValues "{name}"[{i}]: needs en and text')
                if has_rom and not v.get("rom"):
                    problem(where, f'slotValues "{name}"[{i}]: missing rom')

        # personal slots: one partner value each, and nothing else
        personal = {n for n, s in bp.get("slots", {}).items() if s.get("kind") == "personal"}
        pv = r.get("partnerValues", {})
        for name in sorted(personal):
            v = pv.get(name)
            if not isinstance(v, dict) or not v.get("en") or not v.get("text"):
                problem(where, f'personal slot "{name}" needs a partnerValues entry with en and text')
            elif has_rom and not v.get("rom"):
                problem(where, f'partnerValues "{name}": missing rom')
        for name in sorted(set(pv) - personal):
            problem(where, f'partnerValues "{name}" is not a personal slot')

# ---------------------------------------------------------------- recycling (information only)

notes = []
for code, sid, text, forms in recur:
    others = []
    for osid, (opath, oreal) in languages[code][2].items():
        if osid == sid or not isinstance(oreal.get("lines"), dict):
            continue
        MODE = languages[code][1].get("match", "words")
        lts = [tokens(t, MODE) for item in oreal["lines"].values() for t in item_texts(item)]
        if any(occurs(f, lt) for f in forms for lt in lts if f):
            others.append(osid)
    if others:
        notes.append(f"  {code} {sid}: \"{text}\" also in {', '.join(sorted(others))}")

# ---------------------------------------------------------------- report

if problems:
    for p in problems:
        print(p)
    print(f"\n{len(problems)} problem(s).")
    sys.exit(1)

n_real = sum(len(reals) for _, _, reals in languages.values())
print(f"OK: {len(blueprints)} blueprints, {len(languages)} languages, {n_real} realizations, "
      f"{len(ladder_ids)} scenarios in the ladder.")
if notes:
    print("Chunks that recur in other scenarios (information):")
    print("\n".join(notes))
