# Read this first

You are working on **CoachPrash.github.io**: the GitHub Pages repo of the CoachPrash account, served at https://coachprash.github.io/. It holds free learning tools for CoachPrash students and classes. Prash is the sole author.

Today it holds one tool: **Speak**, at `speak/`.

## Step 1 — always, at the start of a session

1. Confirm you can see the repo on disk. Name the folders you find. If you cannot read files, say so at once rather than working from assumption.
2. Read `_project/sites/speak.md` (the brief), then `_project/sites/speak-spec.md` (the spec). The spec is the build contract: when spec and code disagree, the spec wins, or the spec is changed first.
3. Before any edit, state which files you will change.

## Layout

```
CoachPrash.github.io/
├── .nojekyll              critical: do not delete
├── .gitattributes         * text=auto eol=lf
├── .gitignore
├── index.html             hand-written root page, links to each tool
├── speak/                 Speak app, all hand-written
│   ├── index.html
│   ├── assets/            app.js, content.js, solo.js, speech.js, style.css
│   └── content/           JSON: ladder, scenarios/, hi/, fr/, zh/
├── _build/
│   ├── check_speak.py     validates speak/content/** (standard library only)
│   ├── test_speech.html   matching tests for speak/assets/speech.js (open over http)
│   └── test_speech.js     the same tests without a browser: node _build/test_speech.js
└── _project/              documentation for Claude, not part of any site
    ├── README-FIRST.md    this file
    ├── INSTRUCTIONS-FIELD.txt   text pasted into the Claude Project settings
    └── sites/             speak.md (brief), speak-spec.md (spec), speak-proposals.md (ideas not yet in the spec)
```

Nothing here is generated. There is no build step.

## Rules

1. **`.nojekyll` must exist at the repo root.** Without it GitHub Pages runs Jekyll, which can fail the whole build on an unrelated file.
2. **Asset paths stay relative** (`assets/style.css`, never `/assets/style.css`).
3. **No frameworks, no bundlers, no dependencies.** The tools must still work untouched in five years. If a change seems to need tooling, raise it rather than adding it.
4. **Run `python _build/check_speak.py` before every commit that touches `speak/content/`.** It must print OK. **Run `node _build/test_speech.js` before every commit that touches `speak/assets/speech.js` or `speak/content/`.** It must pass every case. Node is a tool for this test only. The site does not depend on it.
5. **LF line endings.** `.gitattributes` enforces them.
6. **Claude commits, Prash pushes.** Claude's shell runs in a Linux VM on Prash's PC, with this folder mounted.
   - Before a commit, Claude names the files and the one-line message, and waits for Prash's go.
   - On go, Claude runs the checks in rule 4 that apply, then `git add` with named files, then `git commit`, and shows `git log --oneline -1`.
   - Never `git add -A`. Never push, checkout, reset, rebase or amend.
   - Git deletes its own lock files, so the shell needs delete permission on this folder. Claude asks for it once per session and uses it only for git.
   - The VM has no GitHub login, so Prash runs `git push`.
   - Read-only git uses `git --no-optional-locks`.
7. **Never let another repo in the CoachPrash account be named like a folder here** (for example `speak`). A project repo named X claims coachprash.github.io/X/ while it exists.
8. **After each commit, Claude gives Prash the push command** in its own code block. If Claude cannot commit (no delete permission, no shell), it gives the full set for PowerShell instead: `cd`, checker if needed, `git status`, `git add` with named files, `git commit`, `git push`. Each command goes in its own code block. Commit messages are one line.
9. **Spec first.** When the code and the spec disagree, the spec is changed first, with Prash's agreement, then the code.
10. **Speak teaches by chunking.** On the site, say "chunk", never "vocabulary" (spec §3.9).
11. **Never set content to `verified` on Claude's own judgement.** Only Prash (Hindi) or a native-speaker reviewer verifies content. When Prash says "Verified: <lang> <scenario>, <name>, <date>", Claude records it in `review`.
12. **Release rhythm.** Prash teaches a class every Sunday morning. A new version is tested and pushed by **Saturday evening EDT**. Work that would change Sunday's class and is not ready by then waits a week. Plan each week's changes toward that deadline.

## Writing style

- Site content: lean ASD-STE100 Simplified Technical English. Short sentences, active voice, one idea per sentence, terms defined once and used the same way.
- Zinsser's four: simplicity, brevity, clarity, humanity.
- Conversation about the work is normal and informal.
- Tell Prash plainly when he is wrong or when what he asked for is weaker than the alternative.

## Environment

| Thing | Value |
|---|---|
| Repo | github.com/CoachPrash/CoachPrash.github.io |
| Live | https://coachprash.github.io/ |
| Local | `C:\Users\ipras\OneDrive\Documents\Claude\CoachPrash.github.io` (under OneDrive) |
| Branch | `main`, Pages deploys from main / root |
| Git identity (repo-local) | `CoachPrash <69826040+CoachPrash@users.noreply.github.com>` |
| Remote | `https://CoachPrash@github.com/CoachPrash/CoachPrash.github.io.git` |

The `CoachPrash@` in the remote URL makes Windows keep a separate saved login for this account. The iprash repo on the same machine uses the iPrash login.

Windows, PowerShell: use `curl.exe`, not `curl`. `robocopy` exit code 1 means success.

## Test and publish

```powershell
cd C:\Users\ipras\OneDrive\Documents\Claude\CoachPrash.github.io
python _build\check_speak.py
python -m http.server          # then open http://localhost:8000/speak/ and /_build/test_speech.html
git add <named files>         # never -A
git status
git commit -m "..."
git push
curl.exe -sI https://coachprash.github.io/speak/ | Select-Object -First 1
```

Speak loads JSON, so it does not run from `file://`. Check that the Actions run went green: a failed Pages build looks the same as nothing happening.

## History

- **9 October 2026:** Speak moved here from `iPrash/iprash.github.io` (commit `555c9fb`). Its earlier git history stays in that repo. The old address, iprash.github.io/speak/, carries a redirect stub. Delete that stub from the iprash repo in November 2026.
- **Status at the move:** M1 done (spec §8). Next is **M2, solo mode**. All content is `draft`, not yet reviewed by native speakers.
- **9 October 2026:** M2 built (spec 0.7.2).
- **10 October 2026:** M2 done: Prash's spoken test passed. Proposals in `_project/sites/speak-proposals.md`.
- **11 October 2026:** M2.5 done (chunks and gender). Used in Prash's Sunday class.
