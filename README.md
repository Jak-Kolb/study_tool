# study_tool

Turn a class's materials (textbook chapters, lecture slides, handouts, the instructor's exam hints) into a practice-exam website. Each exam is one self-contained HTML file:

- flashcards that repeat what you miss,
- a quiz that explains every answer choice,
- a timed-style mock exam,
- a searchable study guide,
- plus any custom drills the exam needs (labeled figures, model diagrams, and so on).

Progress saves in your browser.

This repo is the framework. Your exams and your course files stay on your computer and are never committed.

## Make an exam

You need Python 3. Node.js is optional and is used by the checking tools.

1. **Get the tool**

   ```bash
   git clone https://github.com/Jak-Kolb/study_tool.git
   cd study_tool
   ```

2. **Create the exam folder**

   ```bash
   python3 build.py new bme551-midterm --course "BME 551" --title "BME 551 · Midterm"
   ```

3. **Add your materials.** Put the chapters, slides, handouts and any notes about the exam in `exams/bme551-midterm/materials/`.

4. **Have an AI agent write the exam.** Open the repo folder in Claude (Cowork or Claude Code) or another coding agent and say:

   > Build the practice exam in `exams/bme551-midterm` from its materials. Follow AGENTS.md.

   It reads every file, writes the questions and flashcards into `workspace/content.js`, adds any custom drills, checks its work, and builds the site. You can also fill in `content.js` by hand: the format is documented inside it.

5. **Build and open it**

   ```bash
   python3 build.py bme551-midterm
   ```

   Open `exams/bme551-midterm/bme551-midterm.html` in your browser. `index.html` at the top of the repo lists all your exams.

## Commands

| Command | What it does |
| --- | --- |
| `python3 build.py` | Build every exam and `index.html` |
| `python3 build.py <id>` | Build one exam |
| `python3 build.py new <id> --course "…" --title "…"` | Create a new exam folder |
| `python3 build.py list` | List your exams and when each was built |
| `node backbone/tools/check_content.js <id>` | Check an exam's data. It flags broken links, leftover placeholders, and answer choices that give themselves away. |
| `node backbone/tools/smoke_test.js <id>` | Click through the built site in a headless browser. Needs Playwright: `npm i -D playwright && npx playwright install chromium`. |

`pip install pillow` is only needed if an exam embeds grayscale figures.

## What's in the repo

```
AGENTS.md          rules and step-by-step workflow for agents building an exam
backbone/
  build.py         build, scaffold, list
  template/        the starter app every exam begins from
  tools/           content checker, browser smoke test
exams/             your exams (local only — see exams/README.md)
build.py           shortcut for backbone/build.py
```

Nothing under `exams/` is committed, and neither is any PDF, slide deck or Word file. Course materials, question banks and built exams never reach GitHub.
