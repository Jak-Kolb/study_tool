#!/usr/bin/env node
// Open a built exam in a headless browser, visit every tool at desktop and phone
// widths, answer a few items, and report page errors and horizontal overflow.
//   node backbone/tools/smoke_test.js <exam-id>
// Needs Playwright:  npm i -D playwright && npx playwright install chromium
// (or set CHROMIUM_PATH to an existing Chromium binary). Screenshots go to the
// OS temp folder, printed at the end.
const path = require("path"), os = require("os"), fs = require("fs");
let chromium;
try { ({ chromium } = require("playwright")); }
catch (e) { console.error("Playwright not found. Install it with: npm i -D playwright && npx playwright install chromium"); process.exit(2); }
const examId = process.argv[2];
if (!examId) { console.error("usage: node backbone/tools/smoke_test.js <exam-id>"); process.exit(2); }
const file = path.resolve(__dirname, "..", "..", "exams", examId, `${examId}.html`);
if (!fs.existsSync(file)) { console.error(`not built: ${file}\nrun: python3 build.py ${examId}`); process.exit(2); }
const shots = fs.mkdtempSync(path.join(os.tmpdir(), `smoke-${examId}-`));

(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const errors = [], report = [];
  for (const vp of [{ width: 1280, height: 900, tag: "desktop" }, { width: 390, height: 844, tag: "phone" }]) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    page.on("pageerror", e => errors.push(`${vp.tag}: ${e.message}`));
    page.on("console", m => { if (m.type() === "error") errors.push(`${vp.tag} console: ${m.text()}`); });
    await page.goto("file://" + file);
    const views = await page.evaluate(() => VIEWS.map(v => v[0]));
    for (const v of views) {
      await page.evaluate(v => go(v), v);
      await page.waitForTimeout(120);
      // light interaction with the built-in tools when present
      await page.evaluate(v => {
        try {
          if (v === "quiz" && typeof qStart === "function") { qStart("all", "all", "all", 3, false); qPick(qz.items[0].order[0]); }
          if (v === "cards" && typeof cRate === "function") { cf.flip = true; cRate(1); }
          if (v === "evidence" && typeof evPick === "function") { evPick(0); }
          if (v === "exam" && typeof exStart === "function") { exStart(); exGrade(); }
        } catch (e) { console.error(`interaction on ${v}: ${e.message}`); }
      }, v);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth);
      if (overflow > vp.width + 1) errors.push(`${vp.tag}: '${v}' scrolls sideways (${overflow}px > ${vp.width}px)`);
      await page.screenshot({ path: path.join(shots, `${vp.tag}-${v}.png`), fullPage: vp.tag === "desktop" });
    }
    report.push(`${vp.tag}: visited ${views.join(", ")}`);
    await page.close();
  }
  await browser.close();
  console.log(report.join("\n"));
  console.log(`screenshots: ${shots}`);
  if (errors.length) { console.log(`\nPROBLEMS (${errors.length})`); errors.forEach(e => console.log("  " + e)); }
  console.log(`\nRESULT: ${errors.length ? "FAIL" : "PASS"}`);
  process.exit(errors.length ? 1 : 0);
})();
