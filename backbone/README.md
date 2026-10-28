# Backbone

The shared build, the starter template every exam begins from, and two tools for checking an exam. Exam facts never live here. Every exam folder under `exams/` is local only (gitignored). The workflow for building an exam is in `../AGENTS.md`.

## Workspace contract

Each exam is `exams/<id>/`. The folder name is the exam id and the name of the built file.

| Path | Role |
| --- | --- |
| `materials/` | Source files. The build never reads them; agents do. |
| `workspace/exam.json` | Build config: `id`, `course`, `title`, `description` (shown on `index.html`), `storageKey`, `app`, `replacements`. |
| `workspace/app.html` | The site. Must contain the placeholder `/*__CONTENT__*/` (inside a `<script>`). |
| `workspace/content.js` | Data only, pasted into `app.html` at that placeholder. Defines `EXAM` and the collections the tools read. |
| `workspace/assets/` | Images (or other files) that `exam.json` embeds. |
| `<id>.html` | Build output. Self-contained: no network, no external files. |

## Build

```bash
python3 build.py                    # every exam, then index.html
python3 build.py <id> [<id> …]      # some exams, then index.html
python3 build.py list
python3 build.py new <id> --course "…" --title "…"
```

What a build does:

- It refuses to run when two exams share a `storageKey`.
- It replaces every `replacements` token in `app.html` with the file named for it.
- It fails if a `/*__TOKEN__*/` placeholder is left anywhere outside a comment line.
- It writes `exams/<id>/<id>.html`, then regenerates `index.html` from every `exam.json` (grouped by `course`).

Replacement modes:

- `text`: paste the file as-is. Used for `content.js`.
- `base64`: paste raw bytes as base64. Use it for JPEG/PNG behind a `data:` URL, e.g. `const IMG_FIG = "data:image/jpeg;base64,` + the token + `";`.
- `gray-jpeg-b64`: convert to a grayscale JPEG (quality 72), then base64. Needs Pillow. Good for line-art figures that don't need color.

`new` copies `template/` into `exams/<id>/workspace/` and fills in the id, course, title, and a fresh `storageKey` (`<id with underscores>_v1`). It also creates `materials/` and a README.

## The template app

`template/app.html` is a complete, subject-agnostic study app. Its tools switch on when `content.js` defines their data:

| Tool | Needs | Notes |
| --- | --- | --- |
| Home | `EXAM`, optional `HINTS` | Progress tiles; instructor-hint tiles link to tools. |
| Flashcards | `CARDS` | Leitner-style boxes; misses come back sooner. Keys: Space flip, 1/2/3 rate. |
| Quiz | `QUIZ` (+ `SECTIONS`, `CHAPTERS`) | Filters by unit, section, and tag. Coverage table with per-section drills. Per-option explanations after each answer (`notes`). Results review. Keys 1–4. |
| Mock Exam | `QUIZ` (+ `STUDIES`, `EX_PLAN`) | Per unit: studies → implication, multiple choice sampled round-robin across sections, then `summary` questions. Graded on submit, with explanations. |
| Evidence | `STUDIES` (+ `CLAIMS`) | Study → implication, and claim → evidence when claims exist. |
| Study Guide | always | Searchable cards, studies and abbreviations. Printable. |

Helpers available to exam-specific tools:

- `rec(bucket, id, ok)`: saves progress under the exam's `storageKey`.
- `wt(bucket, id)` and `weightedPick`: favor missed items.
- `mcButtons`, `optNotes`, `abbrLine`: the multiple-choice UI.
- `esc`, `shuffle`, `chSeg`, `chName`.
- `.figwrap`: an image plus an overlay SVG.

## Tools

- `tools/check_content.js <id> [--strict]` validates `content.js`:
  - structure, and the links between units, sections, claims and studies;
  - duplicate options and duplicate questions;
  - missing notes and leftover `REPLACE ME` placeholders.

  It also prints answer-tell statistics: how often the right answer is the longest or the shortest option, absolute and hedge words, and option length. `--strict` turns missed tell targets into failures. It also accepts the shorter 5-field `QUIZ` items (no section, tag or notes) that older exams use.
- `tools/smoke_test.js <id>` opens the built page with Playwright at 1280 px and 390 px wide. It visits every tool, answers a few items, and fails on page errors or sideways scrolling. Screenshots go to a temp folder. Install with `npm i -D playwright && npx playwright install chromium`, or set `CHROMIUM_PATH`.

## What stays out of the backbone

- Exam facts, questions, figures.
- Tools only one exam needs. Those go in that exam's `app.html`. Promote a tool to the template only when the user asks for it to be reusable.
