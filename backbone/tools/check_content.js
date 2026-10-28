#!/usr/bin/env node
// Validate an exam's content.js and report multiple-choice "tells".
//   node backbone/tools/check_content.js <exam-id> [--strict]
// Exit code 1 on structural errors (and, with --strict, on answer-tell targets missed).
// Works on the standard schema in backbone/template/content.js; older shapes
// (e.g. 5-field QUIZ items without per-option notes) are checked as far as they go.
const fs = require("fs"), path = require("path");
const [examId, ...flags] = process.argv.slice(2);
if (!examId) { console.error("usage: node backbone/tools/check_content.js <exam-id> [--strict]"); process.exit(2); }
const strict = flags.includes("--strict");
const root = path.resolve(__dirname, "..", "..");
const ws = path.join(root, "exams", examId, "workspace");
const src = fs.readFileSync(path.join(ws, "content.js"), "utf8");
const cfg = JSON.parse(fs.readFileSync(path.join(ws, "exam.json"), "utf8"));
const names = [...src.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
let D;
try { D = new Function(src + "\n;return {" + names.join(",") + "};")(); }
catch (e) { console.error("content.js does not run: " + e.message); process.exit(1); }

const errs = [], warns = [];
const E = m => errs.push(m), W = m => warns.push(m);
const isStr = s => typeof s === "string" && s.trim().length > 0;

if (/REPLACE ME/.test(src)) E(`content.js still has ${src.match(/REPLACE ME/g).length} "REPLACE ME" placeholder(s)`);
if (D.EXAM) {
  if (D.EXAM.storageKey !== cfg.storageKey) E(`EXAM.storageKey (${D.EXAM.storageKey}) differs from exam.json storageKey (${cfg.storageKey})`);
} else W("no EXAM object (older exam?) — storageKey comes from exam.json/app.html");

const CH = D.CHAPTERS || null, SEC = D.SECTIONS || null;
const chOk = c => !CH || Object.prototype.hasOwnProperty.call(CH, String(c));
const secCh = k => { const m = String(k).match(/^(.*?)[a-z]+$/); return m ? m[1] : String(k); };
if (SEC && CH) for (const k of Object.keys(SEC)) if (!chOk(secCh(k))) E(`SECTIONS ${k}: unit ${secCh(k)} is not in CHAPTERS`);

// ---- CARDS
(D.CARDS || []).forEach((c, i) => {
  if (!Array.isArray(c) || c.length < 3) return E(`CARDS[${i}]: expected [unit, front, back]`);
  if (!chOk(c[0])) E(`CARDS[${i}]: unit ${c[0]} not in CHAPTERS`);
  if (!isStr(c[1]) || !isStr(c[2])) E(`CARDS[${i}]: empty front/back`);
});

// ---- QUIZ
const Q = D.QUIZ || [];
const stems = new Map();
let withNotes = 0;
Q.forEach((q, i) => {
  if (!Array.isArray(q) || q.length < 5) return E(`QUIZ[${i}]: expected [unit, question, options, answerIndex, takeaway, tag, section, notes]`);
  const [ch, stem, opts, ans, why, tag, sec, notes] = q;
  if (!chOk(ch)) E(`QUIZ[${i}]: unit ${ch} not in CHAPTERS`);
  if (!isStr(stem)) E(`QUIZ[${i}]: empty question`);
  if (!Array.isArray(opts) || opts.length < 2) return E(`QUIZ[${i}]: needs an options array`);
  if (opts.length !== 4) W(`QUIZ[${i}]: ${opts.length} options (standard is 4)`);
  if (opts.some(o => !isStr(o))) E(`QUIZ[${i}]: empty option`);
  if (new Set(opts.map(o => String(o).toLowerCase().trim())).size !== opts.length) E(`QUIZ[${i}]: duplicate options`);
  if (!Number.isInteger(ans) || ans < 0 || ans >= opts.length) E(`QUIZ[${i}]: answerIndex ${ans} out of range`);
  if (!isStr(why)) W(`QUIZ[${i}]: no takeaway`);
  if (q.length >= 7) { if (SEC && sec && !SEC[sec]) E(`QUIZ[${i}]: section ${sec} not in SECTIONS`); if (SEC && sec && secCh(sec) !== String(ch)) E(`QUIZ[${i}]: section ${sec} doesn't belong to unit ${ch}`); }
  if (notes !== undefined) {
    if (!Array.isArray(notes) || notes.length !== opts.length || notes.some(n => !isStr(n))) E(`QUIZ[${i}]: notes must have one non-empty note per option`);
    else withNotes++;
  }
  const key = String(stem).toLowerCase().trim();
  if (stems.has(key)) W(`QUIZ[${i}]: same question text as QUIZ[${stems.get(key)}]`); else stems.set(key, i);
});
if (Q.length && withNotes < Q.length) W(`${Q.length - withNotes} of ${Q.length} quiz questions have no per-option notes`);
if (SEC) for (const k of Object.keys(SEC)) { const n = Q.filter(q => q[6] === k).length; if (!n) W(`section ${k} (${SEC[k]}) has no quiz questions`); }
if (Q.length) { const s = Q.filter(q => q[5] === "summary").length; if (!s) W("no quiz questions tagged \"summary\" (the Mock Exam ends each unit with them)"); }

// ---- STUDIES / CLAIMS
const ST = D.STUDIES || [], CL = D.CLAIMS || {};
const ids = new Set();
ST.forEach((s, i) => {
  const tag = `STUDIES[${i}]${s && s.id ? " " + s.id : ""}`;
  if (!s || typeof s !== "object") return E(`${tag}: not an object`);
  if (!isStr(s.id)) E(`${tag}: missing id`); else if (ids.has(s.id)) E(`${tag}: duplicate id`); else ids.add(s.id);
  if (!chOk(s.ch)) E(`${tag}: unit ${s.ch} not in CHAPTERS`);
  if (s.claim && !CL[s.claim]) E(`${tag}: claim ${s.claim} not in CLAIMS`);
  for (const f of ["cite", "desc", "why"]) if (!isStr(s[f])) E(`${tag}: missing ${f}`);
  if (!Array.isArray(s.opts) || s.opts.length < 2) return E(`${tag}: needs opts`);
  if (!Number.isInteger(s.ans) || s.ans < 0 || s.ans >= s.opts.length) E(`${tag}: ans out of range`);
  if (s.notes && (s.notes.length !== s.opts.length)) E(`${tag}: one note per option`);
  if (s.claim && !isStr(s.short)) W(`${tag}: no 'short' (used by claim → evidence mode)`);
});
for (const c of Object.keys(CL)) if (!ST.some(s => s.claim === c)) W(`CLAIMS ${c}: no study points to it`);

// ---- answer tells
const ABS = /\b(always|never|only|all|none|nothing|entirely|completely|exclusively|solely|every|cannot|impossible|purely)\b/i;
const HEDGE = /\b(may|might|partly|partially|some|likely|probably|can|often|tends?|largely|mostly|at least)\b/i;
function tells(items, label) {
  const its = items.filter(x => x.opts.length >= 3 && Number.isInteger(x.ans) && x.ans < x.opts.length);
  if (!its.length) return;
  let longest = 0, shortest = 0, abs = 0, hedge = 0, long = 0, sc = 0, sd = 0;
  for (const x of its) {
    const L = x.opts.map(o => String(o).length), c = L[x.ans], d = L.filter((_, k) => k !== x.ans);
    if (c > Math.max(...d)) longest++;
    if (c < Math.min(...d)) shortest++;
    sc += c; sd += d.reduce((a, b) => a + b, 0) / d.length;
    const cor = x.opts[x.ans], dis = x.opts.filter((_, k) => k !== x.ans);
    if (dis.some(o => ABS.test(o)) && !ABS.test(cor)) abs++;
    if (HEDGE.test(cor) && !dis.some(o => HEDGE.test(o))) hedge++;
    if (L.some(l => l > 70)) long++;
  }
  const n = its.length, pct = v => Math.round(100 * v / n);
  const lines = [
    [`correct answer is the longest option`, pct(longest), "≤ 30%", pct(longest) <= 30],
    [`correct answer is the shortest option`, pct(shortest), "≥ 15%", pct(shortest) >= 15],
    [`absolute word only in wrong options`, pct(abs), "≤ 10%", pct(abs) <= 10],
    [`hedge word only in the right option`, pct(hedge), "≤ 10%", pct(hedge) <= 10],
    [`items with an option over 70 chars`, pct(long), "≤ 5%", pct(long) <= 5],
  ];
  const ratio = (sc / n) / (sd / n);
  console.log(`\n${label} (${n} items): avg right-answer length ${Math.round(sc / n)} vs wrong ${Math.round(sd / n)} chars (${ratio > 1.12 || ratio < 0.88 ? "MISS" : "ok"}, target within ±12%)`);
  for (const [t, v, target, ok] of lines) console.log(`  ${ok ? "ok  " : "MISS"} ${t}: ${v}%  (target ${target})`);
  const missed = lines.filter(l => !l[3]).length + (ratio > 1.12 || ratio < 0.88 ? 1 : 0);
  if (missed) (strict ? E : W)(`${label}: ${missed} answer-tell target(s) missed — students can guess by the shape of the options`);
}
tells(Q.filter(q => Array.isArray(q) && Array.isArray(q[2])).map(q => ({ opts: q[2], ans: q[3] })), "QUIZ");
tells(ST.filter(s => Array.isArray(s.opts)).map(s => ({ opts: s.opts, ans: s.ans })), "STUDIES");

// ---- summary
const counts = { CARDS: (D.CARDS || []).length, QUIZ: Q.length, STUDIES: ST.length, SECTIONS: SEC ? Object.keys(SEC).length : 0 };
console.log(`\n${examId}: ` + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · "));
if (warns.length) { console.log(`\nWARNINGS (${warns.length})`); warns.slice(0, 60).forEach(w => console.log("  " + w)); if (warns.length > 60) console.log(`  … ${warns.length - 60} more`); }
if (errs.length) { console.log(`\nERRORS (${errs.length})`); errs.slice(0, 80).forEach(e => console.log("  " + e)); if (errs.length > 80) console.log(`  … ${errs.length - 80} more`); }
console.log(`\nRESULT: ${errs.length ? "FAIL" : "PASS"}`);
process.exit(errs.length ? 1 : 0);
