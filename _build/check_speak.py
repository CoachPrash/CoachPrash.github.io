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

REPO = pathlib.Path(__file__).resolve().parent.parent
CONTENT = REPO / "speak" / "content"
SLOT = re.compile(r"\{(\w+)\}")

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
    if not isinstance(data, dict) or data.get("schema") != 1:
        problem(rel(path), 'missing "schema": 1')
    return data


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
    for field in ("title", "goal", "roles", "lines", "vocab", "drill", "free"):
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
    vocab = bp.get("vocab", [])
    if not 5 <= len(vocab) <= 10:
        problem(where, f"{len(vocab)} vocab items; a scenario has 5 to 10")
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
                if check_slots:
                    for a in form.get("accept", []):
                        if slots_in(a) != want:
                            problem(where, f"{label} ({name}): accept slots {sorted(slots_in(a))} != {sorted(want)}")

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

        # vocab
        bp_vocab = {v["id"]: v for v in bp.get("vocab", [])}
        rv = r.get("vocab", {})
        if set(rv) != set(bp_vocab):
            problem(where, f"vocab keys differ from the blueprint: missing {sorted(set(bp_vocab) - set(rv))}, extra {sorted(set(rv) - set(bp_vocab))}")
        for vid, item in rv.items():
            if vid in bp_vocab:
                check_item("vocab", vid, item, "", bp_vocab[vid].get("addressesYou"), False)

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

# ---------------------------------------------------------------- report

if problems:
    for p in problems:
        print(p)
    print(f"\n{len(problems)} problem(s).")
    sys.exit(1)

n_real = sum(len(reals) for _, _, reals in languages.values())
print(f"OK: {len(blueprints)} blueprints, {len(languages)} languages, {n_real} realizations, "
      f"{len(ladder_ids)} scenarios in the ladder.")
