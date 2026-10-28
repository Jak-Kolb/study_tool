# exams/

Your exams live here, one folder each. Everything in this folder except this README is gitignored. Exams stay on your machine.

Create one with:

```bash
python3 build.py new bme551-midterm --course "BME 551" --title "BME 551 · Midterm"
```

That gives every exam the same structure:

```
exams/bme551-midterm/
  README.md              what the exam covers, sources used, decisions
  materials/             drop the textbook chapters, slides, handouts, exam hints here
  workspace/
    exam.json            build config (title, course, storageKey, embedded files)
    app.html             the app (starts as backbone/template/app.html)
    content.js           the questions, flashcards, studies… written from materials/
    assets/              images the app embeds (optional)
  bme551-midterm.html    the built site: open it in a browser
```

Name folders `<course><number>-<exam>` in lowercase: `bio201-exam-2`, `chem115-final`. The folder name is the exam id and the name of the built file.
