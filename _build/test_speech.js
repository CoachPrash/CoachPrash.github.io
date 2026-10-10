#!/usr/bin/env node
/* Run the Speak matching tests without a browser.
 *
 *     node _build/test_speech.js
 *
 * Runs the same cases as _build/test_speech.html (read from its <script id="cases">)
 * against speak/assets/content.js and speak/assets/speech.js, with the real content.
 * Prints each failure and exits 1 if any case fails. Node standard library only.
 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");

const repo = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(repo, p), "utf8");

const html = read("_build/test_speech.html");
const m = /<script id="cases">([\s\S]*?)<\/script>/.exec(html);
if (!m) { console.log("No <script id=\"cases\"> in _build/test_speech.html."); process.exit(1); }

/* A minimal window: fetch reads files from the repo. No speech, no DOM. */
const win = { SPEAK_CONTENT_BASE: "speak/content/" };
win.fetch = (p) => {
  const file = path.join(repo, p);
  const ok = fs.existsSync(file);
  return Promise.resolve({ ok, json: () => Promise.resolve(JSON.parse(fs.readFileSync(file, "utf8"))) });
};
const ctx = vm.createContext({ window: win, fetch: win.fetch, Promise, console, setTimeout, clearTimeout });
vm.runInContext(read("speak/assets/content.js"), ctx, { filename: "content.js" });
vm.runInContext(read("speak/assets/speech.js"), ctx, { filename: "speech.js" });
vm.runInContext(m[1], ctx, { filename: "test_speech.html#cases" });

win.SpeakTests.then((rs) => {
  const bad = rs.filter((r) => !r.ok);
  bad.forEach((r) => console.log(`FAIL ${r.name} | said: ${r.said} | want: ${r.want} | got: ${r.got}`));
  console.log(bad.length ? `${bad.length} of ${rs.length} cases failed.` : `All ${rs.length} cases passed.`);
  process.exit(bad.length ? 1 : 0);
}, (e) => { console.log("Could not run: " + e.message); process.exit(1); });
