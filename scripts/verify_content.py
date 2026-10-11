"""Runs every Python code block in the lesson and editorial Markdown, and every reference
solution against its tests.

    python3 scripts/verify_content.py

Uses only the standard library. Within one Markdown file the blocks share a namespace, in
order, so later blocks may use functions defined by earlier ones. A block passes when it runs
to completion without raising, which is why lesson code ends with assertions.
"""
from __future__ import annotations

import contextlib
import io
import json
import re
import sys
import textwrap
import traceback
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# ```python blocks, and ```python-run blocks (the same code, shown with a Run button).
FENCE = re.compile(r"^([ \t]*)```python(?:-run)?[ \t]*\n(.*?)^\1```[ \t]*$", re.DOTALL | re.MULTILINE)


def python_blocks(markdown: str) -> list[str]:
    return [textwrap.dedent(match.group(2)) for match in FENCE.finditer(markdown)]


def run_markdown(path: Path) -> tuple[int, list[str]]:
    namespace: dict[str, object] = {"__name__": "__lesson__"}
    failures: list[str] = []
    blocks = python_blocks(path.read_text(encoding="utf-8"))
    for number, block in enumerate(blocks, start=1):
        try:
            # Lesson code may print (runnable examples do); only failures are of interest here.
            with contextlib.redirect_stdout(io.StringIO()):
                exec(compile(block, f"{path.name}#block{number}", "exec"), namespace)
        except Exception:  # noqa: BLE001 - report every kind of failure
            failures.append(f"{path.relative_to(ROOT)} block {number}:\n{traceback.format_exc(limit=3)}")
    return len(blocks), failures


def run_problem(directory: Path) -> tuple[int, list[str]]:
    failures: list[str] = []
    spec = json.loads((directory / "tests.json").read_text(encoding="utf-8"))
    name = spec["function"]
    cases = spec["sample"] + spec["hidden"]

    def load(filename: str):
        namespace: dict[str, object] = {"__name__": "__solution__"}
        exec(compile((directory / filename).read_text(encoding="utf-8"), filename, "exec"), namespace)
        return namespace.get(name)

    solution = load("solution.py")
    if not callable(solution):
        return 0, [f"{directory.name}: solution.py does not define {name}()"]
    for case in cases:
        # json round-trip gives each call its own copy, so a solution that mutates its
        # arguments cannot affect later cases.
        args = json.loads(json.dumps(case["args"]))
        try:
            got = solution(*args)
        except Exception:  # noqa: BLE001
            failures.append(f"{directory.name}: {name}{tuple(case['args'])} raised\n{traceback.format_exc(limit=2)}")
            continue
        if got != case["expected"]:
            failures.append(f"{directory.name}: {name}{tuple(case['args'])} returned {got!r}, expected {case['expected']!r}")

    # The starter code must at least be valid Python that defines the function.
    try:
        if not callable(load("starter.py")):
            failures.append(f"{directory.name}: starter.py does not define {name}()")
    except SyntaxError as error:
        failures.append(f"{directory.name}: starter.py has a syntax error: {error}")

    # Sample tests run in the browser, where numbers are doubles: keep them exactly representable.
    def unsafe(value) -> bool:
        if isinstance(value, bool):
            return False
        if isinstance(value, int):
            return abs(value) > 2**53
        if isinstance(value, float):
            return True
        if isinstance(value, list):
            return any(unsafe(item) for item in value)
        if isinstance(value, dict):
            return any(unsafe(item) for item in value.values())
        return False

    for case in spec["sample"]:
        if unsafe(case["args"]) or unsafe(case["expected"]):
            failures.append(f"{directory.name}: sample tests must use integers within 2**53 and no floats; move {case['args']!r} to hidden")
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
        failures.append(f"{directory.name}: function name {name!r} is not a plain identifier")
    if len(spec["sample"]) > 20:
        failures.append(f"{directory.name}: at most 20 sample tests can be run in the browser")
    if len(spec["sample"]) < 2:
        failures.append(f"{directory.name}: needs at least two sample tests")
    if len(spec["hidden"]) < 5:
        failures.append(f"{directory.name}: needs at least five hidden tests")
    return len(cases), failures


def main() -> int:
    failures: list[str] = []
    blocks = 0
    markdown_files = sorted((ROOT / "seed" / "lessons").glob("*.md")) + sorted((ROOT / "seed" / "problems").glob("*/*.md"))
    for path in markdown_files:
        count, errors = run_markdown(path)
        blocks += count
        failures += errors

    cases = 0
    problems = sorted(p for p in (ROOT / "seed" / "problems").glob("*") if p.is_dir())
    for directory in problems:
        count, errors = run_problem(directory)
        cases += count
        failures += errors

    if failures:
        print("\n\n".join(failures))
        print(f"\nFAILED: {len(failures)} problem(s).")
        return 1
    print(f"OK: {blocks} code blocks in {len(markdown_files)} Markdown files, {cases} test cases across {len(problems)} reference solutions.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
