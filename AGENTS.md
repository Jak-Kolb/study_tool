# AGENTS.md — building practice exams in this repo

This repo (`study_tool`) turns a class's source materials (textbook chapters, lecture slides, handouts, the instructor's exam hints) into a self-contained practice-exam website: one HTML file per exam, with flashcards, a quiz that explains every option, a mock exam, a study guide, and any exam-specific drills the materials call for.

Read this file before touching anything. Then read `backbone/README.md` for the technical contract.

## Repo map

```
AGENTS.md                      this file
README.md                      human-facing overview
build.py                       entry point (wraps backbone/build.py)
index.html                     generated list of your local exams (gitignored)
backbone/
  build.py                     build / scaffold / list
  template/                    starter workspace copied into every new exam
    app.html                   generic app: Flashcards, Quiz, Mock Exam, Study Guide, Evidence
    content.js                 data schema with REPLACE ME placeholders
    exam.json                  build config
  tools/
    check_content.js           validates content.js and reports answer "tells"
    smoke_test.js              opens the built page in a headless browser, clicks every tool
exams/README.md                the exam folder structure (the only tracked file under exams/)
exams/<id>/                    ONE EXAM — the whole folder is local only (gitignored)
  README.md                    what this exam covers, sources, decisions, status
  materials/                   source files
  workspace/
    exam.json                  build config for this exam
    app.html                   this exam's app (starts as the template)
    content.js                 this exam's data (questions, cards, studies, figures…)
    assets/                    images the app embeds (optional)
  <id>.html                    the built site
```

The repo is the framework only. Exams are created on the user's machine and stay there. If the user already has finished exams in `exams/`, read their `app.html` for worked examples of custom tools. Never use their content.

## Rules

1. **Never commit anything exam-specific.** Everything under `exams/` except `exams/README.md` is gitignored: materials, questions, figures, built pages. So is every `.pdf`, `.ppt(x)`, `.key`, `.doc(x)` and `.epub` anywhere, and the generated `index.html`. Don't move exam files outside `exams/`, don't force-add them, and don't put course facts in `backbone/`. Before every commit, run `git status` and make sure only framework files are staged.
2. **Each exam's facts come only from its own `materials/`.** Never reuse questions, labels or facts from another exam. If `materials/` is empty or missing what the user described, stop and ask.
3. **Folder name = exam id = HTML name.** `exams/bme551-midterm/` builds to `exams/bme551-midterm/bme551-midterm.html`. Ids are lowercase with hyphens, course first: `<course><number>-<exam>` (e.g. `bio201-exam-3`, `bme551-final`, `chem115-quiz2`).
4. **Never change a shipped exam's `storageKey`.** Browsers store study progress under it. New exams get a new key (the scaffold makes one from the id).
5. **Only touch the exam you were asked about.** Don't edit another exam's folder or `backbone/template/` while building an exam. Improve the template only when the user asks for framework changes.
6. **Commits belong to the repo owner.** Author commits as the identity in `git log` (the owner), and do not add `Co-Authored-By`, "Generated with", or other AI attribution lines. Commit or push only when the user asks.
7. **Accuracy over volume.** A wrong "correct answer" or a wrong option that's arguably right is the worst bug this tool can have. Every item must trace to the materials, and every exam gets an independent accuracy review before it ships (step 7).

## Building a new exam

### 0. Pin down scope with the user

Ask (once, briefly) for anything you can't get from the materials: course and exam name, which chapters/lectures are on it, the exam format (multiple choice? short answer? figures?), and anything the instructor said about it. Instructor hints decide which tools to build. Put them in `HINTS` (shown on the home page).

### 1. Scaffold

```bash
python3 build.py new bme551-midterm --course "BME 551" --title "BME 551 · Midterm"
```

This creates `exams/bme551-midterm/` with `materials/`, a README, and a workspace copied from `backbone/template/` (with a unique `storageKey`). The user drops source files into `materials/`.

### 2. Read every source file

- **Text PDFs** (chapters): `pdftotext file.pdf out.txt`. Read the whole chapter, not just the headings. Find the end-of-chapter "Summary / Key points" section: it's the backbone of the "summary" questions.
- **Slides** (usually images): `pdftoppm -r 150 -png slides.pdf s` then `tesseract s-01.png out`. If the OCR comes back as garbage, the pages are probably rotated: rotate the images 180° (or 90°) with Pillow and OCR again. Look at the slides that hold diagrams yourself; OCR misses arrows and layout.
- **Figures** the exam may use: render the page (`pdftoppm -r 200 -f N -l N`), crop it with Pillow, and save it under `workspace/assets/`. Blank-figure drills work best when you erase labels from a copy (paint the label boxes with the background color) and keep the coordinates of each label.
- Slides show what the instructor emphasized. Where slides and the chapter disagree (years, numbers), use the chapter and note it in the exam README.
- Write extracted text to a scratch folder outside the repo, not into `materials/` or `workspace/`.

### 3. Plan coverage

List every section of every unit on the exam and decide what each gets. Priorities, highest first:

1. Anything the instructor's hints point at (models, figures, "know X").
2. Lecture-slide content and the chapter's Key Points/Summary.
3. Textbook material tied to the main models, mechanisms, regions, evidence, or disorders.
4. Boxes, asides, and trivia that never appear in the slides. Usually cut. Say what you cut in the README.

Every section in `SECTIONS` should end up with quiz questions, and each unit should have a few `summary` questions built from its Key Points.

### 4. Write `content.js`

The schema is documented inline in `backbone/template/content.js`. The short version:

| Constant | Shape | Powers |
| --- | --- | --- |
| `EXAM` | `{id, course, title, subtitle, unitLabel, storageKey}` | header, storage |
| `CHAPTERS` | `{1: "Ch 1 · Title", …}` (units: chapters, lectures, weeks) | filters, grouping |
| `SECTIONS` | `{"1a": "Section title", …}` (unit id + letter) | quiz coverage table, mock-exam sampling |
| `HINTS` | `[{t, tool, how}]` | home page tiles |
| `CARDS` | `[unit, front, back]` | Flashcards (spaced repetition), Study Guide |
| `QUIZ` | `[unit, question, options[4], answerIndex, takeaway, tag, section, notes[4]]` | Quiz, Mock Exam |
| `STUDIES` + `CLAIMS` | see template | Evidence (study → implication, claim → evidence) |
| `ABBR` | `{"fMRI": "functional MRI"}` | abbreviation line under explanations, glossary |
| `EX_PLAN` | `{unit: {st, mc, su}}` | mock-exam size per unit (optional) |

Data only in `content.js`. Interaction only in `app.html`.

**Multiple-choice rules.** These are what keep the quiz from being guessable:

- Exactly 4 options, each ≤ 70 characters (2–8 words is ideal), all the same grammatical form and similar length. Move shared words into the stem.
- Put the correct answer at index 0. The app shuffles. Across the exam, the correct answer should be the longest option in ≤ 30% of items and the shortest in ≥ 15%.
- Wrong options are real terms from the course that are wrong here: the other model or route, the wrong stage, region or hemisphere, a reversed effect, another study's finding. Each must be clearly wrong per the sources. No joke options, and no "all/none of the above".
- No wording tells. Absolutes (always, never, only) don't appear only in wrong options, and hedges (may, partly, can) don't appear only in the right one.
- `notes` has one entry per option: why the right one is right (cite the source), and why each wrong one is wrong and what it actually is. Never just "Incorrect."
- For "Which is NOT…" items, the 3 wrong options must all be true.
- If the sources call an issue unsettled, no option presents it as settled.
- Don't write questions about figure numbers or page numbers.
- Expand an abbreviation the first time it matters, or add it to `ABBR`.

Large exams go faster split into batches (e.g. by section), with several writers working in parallel from the same rules. Then merge them and run the checker on the whole set.

### 5. Add exam-specific tools only when the materials call for them

The template already covers flashcards, quiz, mock exam, study guide, and study → implication. Add a tool when the hints or materials need something those can't do: a labeled-figure drill, a model/pathway explorer, a lesion → deficit drill, a fill-in-the-diagram drill, a calculator. Pattern (comment block "EXAM-SPECIFIC TOOLS" in `app.html`):

1. Data in `content.js`. Images in `workspace/assets/` plus a `replacements` entry in `exam.json` (`"mode": "base64"` for JPEG/PNG; declare `const IMG_X = "data:image/jpeg;base64,` + the placeholder token + `";` in `app.html`).
2. `VIEWS.splice(i, 0, ["id", "Label"])` and `R.id = function(){ … }`.
3. Record answers with `rec("bucket", itemId, ok)`.

Custom tools that have worked well:

- placing or naming labels on a blank figure (the image plus an SVG overlay with the label coordinates);
- a clickable box-and-arrow model diagram with a "lesion mode" that shows what damage to each part causes;
- a deficit ↔ damaged-part drill. Give each item an `alsoOk` list so an arguably right part is never used as a wrong option;
- fill-in-the-blank labels on a slide, after painting the labels out of a copy;
- a classifier that matches a case description to a syndrome.

If the user has finished exams in `exams/`, their `app.html` files show these patterns in full.

### 6. Build, check, test

```bash
python3 build.py bme551-midterm                          # → exams/bme551-midterm/bme551-midterm.html + index.html
node backbone/tools/check_content.js bme551-midterm --strict
node backbone/tools/smoke_test.js bme551-midterm         # needs Playwright (see backbone/README.md)
```

`check_content.js` fails on structural errors and leftover `REPLACE ME` placeholders. With `--strict` it also fails on answer-tell targets. Fix until it prints `RESULT: PASS`. `smoke_test.js` clicks every tool at desktop and phone widths and fails on page errors or sideways scrolling. Look at a few of its screenshots yourself.

### 7. Independent accuracy review

Have a second pass (a separate agent, or you with fresh eyes) check every item against the materials:

- Is the correct answer correct?
- Is every wrong option clearly wrong, and not just "also true"?
- Is every note accurate?
- Does the stem read correctly with every option?

Fix what it finds. Re-run step 6.

### 8. Document and hand off

Update `exams/<id>/README.md` with:

- the sources used,
- what was cut and why,
- the tools added,
- known open issues (for example, a place where the chapter and slides disagree).

Tell the user what was built, and how to open it: the built HTML, or `index.html`. Commit only if asked (see rule 6).

## Updating an existing exam

- **A unit swapped** (e.g. "Chapter 7 is out, Chapter 15 is in"):
  - Remove that unit everywhere in `content.js`: `CHAPTERS`, `SECTIONS`, `CARDS`, `QUIZ`, `STUDIES`, the `CLAIMS` only it used, and its tool data.
  - Remove its references in `app.html`: nav tabs, labels, any text that names the unit.
  - Then grep for leftover mentions in distractors and notes of the remaining units.
- **A tool is cut** (the instructor said it's not on the exam): remove the tool and its data. Don't just hide it.
- Always rebuild, re-run the checker and smoke test, and keep the `storageKey`.

## Git and GitHub

The repo tracks only the framework:

- `backbone/`, `build.py`;
- `AGENTS.md`, `CLAUDE.md`, `README.md`, `exams/README.md`;
- `.gitignore`.

Everything else under `exams/` is ignored, along with the generated `index.html` and every document format. Exams stay local.

When you improve the framework while building an exam (the template, the build, the tools), keep those changes free of course facts so they can be committed.

To share or back up a finished exam, send the built `exams/<id>/<id>.html` file itself. It's self-contained. Never commit it to this repo.
