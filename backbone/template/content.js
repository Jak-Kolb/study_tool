// =====================================================================
// __TITLE__ — content.js (DATA ONLY)
// The build pastes this file into app.html at /*__CONTENT__*/.
// Fill everything from this exam's ../materials folder. Never copy facts from
// another exam. Delete every "REPLACE ME" placeholder before shipping —
// `node backbone/tools/check_content.js __EXAM_ID__` fails while any remain.
//
// Built-in tools turn on automatically when their data exists:
//   CARDS → Flashcards · QUIZ (+ SECTIONS) → Quiz + Mock Exam
//   STUDIES (+ CLAIMS) → Evidence · ABBR → abbreviation lines + glossary
// =====================================================================

const EXAM = {
  id: "__EXAM_ID__",
  course: "__COURSE__",
  title: "__TITLE__",
  subtitle: "REPLACE ME: what this exam covers, e.g. 'Textbook Ch 3–5 · Lectures 6–10'",
  unitLabel: "Ch",                 // how units are named in the UI: "Ch", "Lecture", "Week", "Unit"…
  // Browser progress key. Unique per exam. Never change it once people have used the site.
  storageKey: "__STORAGE_KEY__",
};

// Units of the exam (chapters, lectures, weeks). Keys are short ids used everywhere below.
const CHAPTERS = {
  1: "Ch 1 · REPLACE ME",
};

// Optional: what the instructor said about the exam. Each tile links to a tool (a VIEWS key).
const HINTS = [
  // { t: "REPLACE ME: the hint, close to the instructor's words", tool: "quiz", how: "Where to practice it in this tool." },
];

// Sections inside each unit. Key = unit id + letter ("1a", "1b", "15a"…). Every section should have quiz questions.
const SECTIONS = {
  "1a": "REPLACE ME: section title",
};

// Flashcards: [unit, front, back]
const CARDS = [
  [1, "REPLACE ME: term", "REPLACE ME: plain-language definition from the materials."],
];

// Quiz: [unit, question, options, answerIndex, takeaway, tag, section, notes]
//  - options: exactly 4, short (≤ 70 chars), same grammatical form and similar length. Put the correct one FIRST
//    (answerIndex 0); the app shuffles. Distractors must be plausible (real terms from the course) and clearly wrong.
//  - notes: one per option — why it's right, or why it's wrong and what it actually is. Shown after answering.
//  - takeaway: one line shown after answering.
//  - tag: "summary" (from the chapter's key points/summary) or anything else ("fact", "model", "def", "calc"…).
//    The Mock Exam ends each unit with "summary" questions.
const QUIZ = [
  [1, "REPLACE ME: question stem?",
    ["Correct option", "Plausible wrong option", "Another plausible wrong", "A third plausible wrong"],
    0, "REPLACE ME: one-line takeaway.", "fact", "1a",
    ["Why the correct option is right (cite the source).", "Why this is wrong and what it actually is.", "Why this is wrong and what it actually is.", "Why this is wrong and what it actually is."]],
];

// Optional — "brief study → what does it imply?" items (Evidence tool). Delete if the course has no studies.
// const CLAIMS = { c_example: { model: "Model name", text: "the claim this evidence supports" } };
// const STUDIES = [
//   { id: "author2020", ch: 1, claim: "c_example", cite: "Author et al. (2020) — method",
//     desc: "2–3 sentence vignette of design + result. Don't state the implication.",
//     short: "≤ 90 chars: finding → region/pattern (used in claim → evidence mode)",
//     opts: ["Correct implication", "Wrong 1", "Wrong 2", "Wrong 3"],
//     notes: ["why right", "why wrong", "why wrong", "why wrong"], ans: 0,
//     why: "One-line takeaway." },
// ];

// Optional — abbreviations spelled out under explanations and listed in the Study Guide.
const ABBR = {
  // "fMRI": "functional magnetic resonance imaging",
};

// Optional — Mock Exam size per unit: { st: studies, mc: multiple choice, su: summary }.
// const EX_PLAN = { 1: { st: 4, mc: 10, su: 3 } };

// Optional — labels for quiz tags in the Type filter.
// const QUIZ_TYPES = [["fact", "Facts"], ["summary", "Summary questions"]];
