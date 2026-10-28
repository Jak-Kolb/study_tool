#!/usr/bin/env python3
"""Build practice-exam sites, and scaffold new ones.

From the repo root:
  python3 build.py                     build every exam + the index page
  python3 build.py <id> [<id> ...]     build those exams + the index page
  python3 build.py new <id> --course "BME 551" --title "BME 551 · Midterm"
                                       scaffold exams/<id>/ from backbone/template
  python3 build.py list                show every exam and whether it is built

Each exam lives in exams/<id>/:
  materials/          source PDFs, slides, handouts
  workspace/          exam.json, app.html, content.js, assets/
  <id>.html           the built, self-contained site
The whole exams/<id>/ folder is local only (gitignored). The repo tracks the framework.

The repo-root index.html is regenerated on every build and links every built exam.
"""
import base64, datetime, html as htmllib, io, json, re, shutil, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXAMS = ROOT / "exams"
TEMPLATE = ROOT / "backbone" / "template"
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def exam_ids():
    return sorted(p.parent.parent.name for p in EXAMS.glob("*/workspace/exam.json"))


def load_cfg(exam_id):
    path = EXAMS / exam_id / "workspace" / "exam.json"
    if not path.is_file():
        sys.exit(f"no workspace config: {path.relative_to(ROOT)}  (create one with: python3 build.py new {exam_id})")
    return json.loads(path.read_text())


def out_path(exam_id):
    return EXAMS / exam_id / f"{exam_id}.html"


def build(exam_id):
    workspace = EXAMS / exam_id / "workspace"
    cfg = load_cfg(exam_id)
    if cfg.get("id") and cfg["id"] != exam_id:
        print(f"  note: exam.json id {cfg['id']!r} differs from folder name {exam_id!r}; the folder name wins")
    if "publishToRoot" in cfg:
        print("  note: publishToRoot is no longer used; every exam builds to exams/<id>/<id>.html")
    app_path = workspace / cfg.get("app", "app.html")
    if not app_path.is_file():
        sys.exit(f"workspace has no app yet: {app_path.relative_to(ROOT)}")
    html = app_path.read_text()
    for rep in cfg.get("replacements", []):
        token, src, mode = rep["token"], workspace / rep["file"], rep.get("mode", "text")
        if token not in html:
            sys.exit(f"{app_path.name} has no placeholder {token}")
        if not src.is_file():
            sys.exit(f"missing {src.relative_to(ROOT)} for {token}")
        html = html.replace(token, embed(src, mode))
    # Any placeholder still in the page (outside comment lines) means exam.json is missing a replacement.
    left = sorted({tok for line in html.splitlines() if not line.lstrip().startswith(("//", "*"))
                   for tok in re.findall(r"/\*__[A-Z0-9_]+__\*/", line)})
    if left:
        sys.exit(f"{exam_id}: placeholders with no exam.json replacement: {', '.join(left)}")
    out = out_path(exam_id)
    out.write_text(html)
    print(f"wrote {out.relative_to(ROOT)} ({len(html)/1024:.0f} KB)")


def embed(path, mode):
    if mode == "text":
        return path.read_text()
    if mode == "base64":
        return base64.b64encode(path.read_bytes()).decode()
    if mode == "gray-jpeg-b64":
        from PIL import Image  # pip install pillow
        buf = io.BytesIO()
        Image.open(path).convert("L").save(buf, "JPEG", quality=72)
        return base64.b64encode(buf.getvalue()).decode()
    sys.exit(f"unknown embed mode {mode!r} for {path.name}")


def check_storage_keys():
    seen = {}
    for eid in exam_ids():
        key = load_cfg(eid).get("storageKey")
        if not key:
            sys.exit(f"{eid}: exam.json has no storageKey")
        if key in seen:
            sys.exit(f"storageKey {key!r} is used by both {seen[key]} and {eid}; each exam needs its own")
        seen[key] = eid


def write_index():
    rows = []
    for eid in exam_ids():
        cfg = load_cfg(eid)
        out = out_path(eid)
        rows.append({
            "id": eid,
            "course": cfg.get("course", ""),
            "title": cfg.get("title", eid),
            "description": cfg.get("description", ""),
            "built": out.is_file(),
            "size": out.stat().st_size if out.is_file() else 0,
            "date": datetime.date.fromtimestamp(out.stat().st_mtime).isoformat() if out.is_file() else "",
        })
    courses = {}
    for r in rows:
        courses.setdefault(r["course"] or "Other", []).append(r)
    e = htmllib.escape
    blocks = []
    for course in sorted(courses):
        cards = []
        for r in courses[course]:
            if r["built"]:
                link = f'<a class="open" href="exams/{e(r["id"])}/{e(r["id"])}.html">Open</a>'
                meta = f'{r["size"]/1024:.0f} KB · built {r["date"]}'
            else:
                link = '<span class="open off">Not built yet</span>'
                meta = f"python3 build.py {e(r['id'])}"
            cards.append(f'<div class="card"><div class="t">{e(r["title"])}</div>'
                         f'<div class="d">{e(r["description"])}</div>'
                         f'<div class="m">{link}<span>{meta}</span></div></div>')
        blocks.append(f'<h2>{e(course)}</h2><div class="grid">{"".join(cards)}</div>')
    page = INDEX_TEMPLATE.replace("{{BLOCKS}}", "\n".join(blocks) or "<p>No exams yet. Run <code>python3 build.py new &lt;id&gt;</code>.</p>")
    (ROOT / "index.html").write_text(page)
    print(f"wrote index.html ({len(rows)} exam{'s' if len(rows) != 1 else ''})")


INDEX_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Practice exams</title>
<style>
:root{--bg:#f6f5f1;--panel:#fff;--ink:#1c1d21;--muted:#6b6e76;--line:#e3e1da;--accent:#3b5bdb}
@media (prefers-color-scheme: dark){:root{--bg:#15161a;--panel:#1e2026;--ink:#e9e9ec;--muted:#9a9ca5;--line:#30333b;--accent:#7c93ff}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,Helvetica,Arial,sans-serif}
main{max-width:960px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:28px;letter-spacing:-.02em;margin:0 0 4px}
h2{font-size:18px;margin:26px 0 10px}
p{color:var(--muted);margin:4px 0}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;display:flex;flex-direction:column;gap:6px}
.t{font-weight:700;font-size:16px}
.d{color:var(--muted);font-size:14px;flex:1}
.m{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.open{background:var(--accent);color:#fff;text-decoration:none;font-weight:600;padding:6px 14px;border-radius:9px;font-size:14px}
.open.off{background:var(--line);color:var(--muted)}
code{font-size:13px}
</style>
</head>
<body>
<main>
<h1>Practice exams</h1>
<p>Each exam is one self-contained page. Progress saves in your browser.</p>
{{BLOCKS}}
</main>
</body>
</html>
"""


def scaffold(args):
    if not args:
        sys.exit('usage: python3 build.py new <id> [--course "BME 551"] [--title "BME 551 · Midterm"]')
    exam_id, opts = args[0], {}
    rest = args[1:]
    while rest:
        flag = rest.pop(0)
        if flag not in ("--course", "--title") or not rest:
            sys.exit(f"unknown or incomplete option: {flag}")
        opts[flag[2:]] = rest.pop(0)
    if not ID_RE.match(exam_id):
        sys.exit("exam id must be lowercase letters, digits and hyphens, e.g. bme551-midterm")
    base = EXAMS / exam_id
    if base.exists():
        sys.exit(f"{base.relative_to(ROOT)} already exists")
    course = opts.get("course", "")
    title = opts.get("title") or (f"{course} · {exam_id}" if course else exam_id)
    key = re.sub(r"[^a-z0-9]+", "_", exam_id) + "_v1"
    used = {load_cfg(e).get("storageKey") for e in exam_ids()}
    if key in used:
        sys.exit(f"storageKey {key} is already used; pick another exam id")
    shutil.copytree(TEMPLATE, base / "workspace")
    for name in ("content.js", "exam.json", "app.html"):
        p = base / "workspace" / name
        txt = p.read_text()
        for tok, val in (("__EXAM_ID__", exam_id), ("__COURSE__", course), ("__TITLE__", title), ("__STORAGE_KEY__", key)):
            txt = txt.replace(tok, val.replace("\\", "\\\\").replace('"', '\\"') if name != "app.html" else val)
        p.write_text(txt)
    (base / "materials").mkdir(parents=True)
    (base / "materials" / ".gitkeep").write_text("")
    (base / "materials" / "README.md").write_text(MATERIALS_README.format(title=title))
    (base / "README.md").write_text(EXAM_README.format(title=title, id=exam_id, key=key))
    print(f"created {base.relative_to(ROOT)}/  (storageKey {key})")
    print(f"next: put sources in exams/{exam_id}/materials/, fill workspace/content.js, then python3 build.py {exam_id}")


MATERIALS_README = """# {title} — materials

Drop this exam's source files here: textbook chapters, lecture slides, handouts, review sheets, the instructor's exam hints.

The whole exam folder is gitignored, so publisher and instructor files never go to GitHub.
"""

EXAM_README = """# {title}

Status: not built yet.

- `materials/` — source files. List what is here and which parts the exam covers.
- `workspace/content.js` — the question bank and data. Built from `materials/` only.
- `workspace/app.html` — the starter app: Flashcards, Quiz, Mock Exam, Study Guide (+ Evidence when STUDIES exist). Add exam-specific tools here.
- `{id}.html` — the built site. `python3 build.py {id}`

Browser progress key: `{key}`. Do not change it once the site has been used.

## Notes for the next agent

- What the instructor said the exam covers:
- Sources used and anything skipped (and why):
- Tools added beyond the starter set:
"""


def list_exams():
    for eid in exam_ids():
        cfg = load_cfg(eid)
        out = out_path(eid)
        state = f"built {datetime.date.fromtimestamp(out.stat().st_mtime).isoformat()}" if out.is_file() else "not built"
        print(f"{eid:28s} {cfg.get('course', ''):12s} {state:22s} {cfg.get('title', '')}")


def main():
    args = sys.argv[1:]
    if args and args[0] == "new":
        scaffold(args[1:]); write_index(); return
    if args and args[0] == "list":
        list_exams(); return
    check_storage_keys()
    for eid in (args or exam_ids()):
        build(eid)
    write_index()


if __name__ == "__main__":
    main()
