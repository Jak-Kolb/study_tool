#!/usr/bin/env python3
"""Build or scaffold practice exams. The real script is backbone/build.py.

  python3 build.py                  build every exam + index.html
  python3 build.py <id> [<id>...]   build those exams + index.html
  python3 build.py new <id> --course "BME 551" --title "BME 551 · Midterm"
  python3 build.py list
"""
import runpy, sys
from pathlib import Path

script = Path(__file__).resolve().parent / "backbone" / "build.py"
sys.argv = [str(script)] + sys.argv[1:]
runpy.run_path(str(script), run_name="__main__")
