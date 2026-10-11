/**
 * Runs the Python harness (the code that executes inside Pyodide in the browser) under the
 * local CPython, so its behaviour is checked without a browser or a network.
 *
 * Skipped when python3 is not installed.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

import { playgroundExamples } from "@/lib/python/examples";
import { HARNESS_LIMITS, PYTHON_HARNESS } from "@/lib/python/harness";
import { summariseTests, type ProgramResult, type PythonRequest, type PythonResult, type TestsResult } from "@/lib/python/types";

const python = spawnSync("python3", ["--version"], { encoding: "utf8" });
const available = python.status === 0;

let script = "";

function execute(request: PythonRequest, timeoutMs = 20_000): PythonResult {
  const child = spawnSync("python3", ["-I", script], { input: JSON.stringify(request), encoding: "utf8", timeout: timeoutMs });
  if (child.status !== 0) throw new Error(`harness exited with ${child.status}: ${child.stderr}`);
  return JSON.parse(child.stdout) as PythonResult;
}

const program = (code: string) => execute({ kind: "program", code }) as ProgramResult;
const tests = (code: string, functionName: string, cases: { args: unknown[]; expected: unknown }[]) =>
  execute({ kind: "tests", code, functionName, tests: cases }) as TestsResult;

const lowerBound = `def lower_bound(items, target):
    lo, hi = 0, len(items)
    while lo < hi:
        mid = (lo + hi) // 2
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
`;

const cases = [
  { args: [[1, 3, 3, 5, 8], 3], expected: 1 },
  { args: [[1, 3, 3, 5, 8], 4], expected: 3 },
  { args: [[], 7], expected: 0 },
];

describe.skipIf(!available)("python harness", () => {
  beforeAll(() => {
    const directory = mkdtempSync(path.join(tmpdir(), "dsa-harness-"));
    script = path.join(directory, "run_harness.py");
    // The harness, followed by the two lines the worker performs in JavaScript.
    writeFileSync(script, `${PYTHON_HARNESS}\nimport sys as _sys\n_real_stdout = _sys.stdout\n_real_stdout.write(handle_request(_sys.stdin.read()))\n`);
  });

  describe("running a program", () => {
    it("captures standard output and reports success", () => {
      const result = program('print("hello")\nprint(6 * 7)\n');
      expect(result).toMatchObject({ kind: "program", status: "ok", stdout: "hello\n42\n", stderr: "", error: null, truncated: false });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("keeps standard error separate from standard output", () => {
      const result = program('import sys\nprint("out")\nprint("err", file=sys.stderr)\n');
      expect(result.stdout).toBe("out\n");
      expect(result.stderr).toBe("err\n");
    });

    it("reports a syntax error with its line, without running anything", () => {
      const result = program('print("before")\ndef f(:\n    pass\n');
      expect(result.status).toBe("error");
      expect(result.stdout).toBe("");
      expect(result.error).toMatchObject({ type: "SyntaxError", line: 2 });
      expect(result.error!.traceback).toContain('File "solution.py", line 2');
      expect(result.error!.traceback).toContain("def f(:");
    });

    it.each([
      ["NameError", "print(undefined_name)\n", 1],
      ["TypeError", 'x = 1\ny = x + "a"\n', 2],
      ["IndexError", "items = [1, 2, 3]\n\nprint(items[5])\n", 3],
      ["ValueError", 'n = int("abc")\n', 1],
      ["AssertionError", "assert 1 + 1 == 3, 'arithmetic'\n", 1],
      ["ZeroDivisionError", "print(1 // 0)\n", 1],
      ["KeyError", "d = {}\nd['missing']\n", 2],
    ])("reports a %s with the failing line", (type, code, line) => {
      const result = program(code);
      expect(result.status).toBe("error");
      expect(result.error).toMatchObject({ type, line });
      expect(result.error!.traceback).toContain(`${type}`);
    });

    it("keeps output printed before an error", () => {
      const result = program('print("step 1")\nraise ValueError("stop here")\n');
      expect(result.stdout).toBe("step 1\n");
      expect(result.error).toMatchObject({ type: "ValueError", message: "stop here", line: 2 });
    });

    it("shows only the student's own lines in a traceback, with the source text", () => {
      const result = program("def inner(x):\n    return 1 / x\n\ndef outer():\n    return inner(0)\n\nouter()\n");
      const traceback = result.error!.traceback;
      expect(traceback).toContain("Traceback (most recent call last):");
      expect(traceback).toContain("return 1 / x");
      expect(traceback).toContain("in outer");
      expect(traceback).not.toMatch(/run_harness|handle_request|_execute|<string>/);
      expect(result.error!.line).toBe(2);
    });

    it("stops a program that prints without end, and says the output was cut", () => {
      const result = program('while True:\n    print("x" * 50)\n');
      expect(result.status).toBe("output_limit");
      expect(result.truncated).toBe(true);
      expect(result.stdout.length).toBe(HARNESS_LIMITS.maxOutput);
      expect(result.error).toBeNull();
    });

    it("cannot be kept alive by catching the output limit", () => {
      const result = program('while True:\n    try:\n        print("x" * 100)\n    except Exception:\n        pass\n');
      expect(result.status).toBe("output_limit");
      expect(result.stdout.length + result.stderr.length).toBeLessThanOrEqual(HARNESS_LIMITS.maxOutput);
    });

    it("counts standard output and standard error against one limit", () => {
      const result = program('import sys\nwhile True:\n    print("o" * 99)\n    print("e" * 99, file=sys.stderr)\n');
      expect(result.status).toBe("output_limit");
      expect(result.stdout.length + result.stderr.length).toBe(HARNESS_LIMITS.maxOutput);
    });

    it("reports deep recursion as a RecursionError instead of crashing", () => {
      const result = program("def f(n):\n    return f(n + 1)\n\nf(0)\n");
      expect(result.status).toBe("error");
      expect(result.error!.type).toBe("RecursionError");
      expect(result.error!.traceback.length).toBeLessThan(500);
    });

    it("explains that input() is unavailable", () => {
      const result = program('name = input("Name? ")\n');
      expect(result.error).toMatchObject({ type: "RuntimeError", line: 1 });
      expect(result.error!.message).toContain("input() is not available");
    });

    it("treats exit() as a normal end and a failing exit code as an error", () => {
      expect(program('print("a")\nimport sys\nsys.exit()\nprint("b")\n')).toMatchObject({ status: "ok", stdout: "a\n" });
      expect(program("import sys\nsys.exit(0)\n").status).toBe("ok");
      expect(program("import sys\nsys.exit(3)\n")).toMatchObject({ status: "error", error: { type: "SystemExit" } });
    });

    it("does not let one run's variables leak into the next", () => {
      // Each call to the harness in the browser reuses the interpreter; simulate that here.
      const directory = mkdtempSync(path.join(tmpdir(), "dsa-harness-"));
      const twice = path.join(directory, "twice.py");
      writeFileSync(
        twice,
        `${PYTHON_HARNESS}\nimport json as _j, sys as _s\n_out = _s.stdout\nfirst = handle_request(_j.dumps({"kind": "program", "code": "secret = 41\\nprint(secret)\\n"}))\nsecond = handle_request(_j.dumps({"kind": "program", "code": "print(secret)\\n"}))\n_out.write(_j.dumps([_j.loads(first), _j.loads(second)]))\n`,
      );
      const child = spawnSync("python3", ["-I", twice], { encoding: "utf8" });
      const [first, second] = JSON.parse(child.stdout) as ProgramResult[];
      expect(first!.stdout).toBe("41\n");
      expect(second!.error).toMatchObject({ type: "NameError" });
    });

    it("restores the real output streams after every run, even a failed one", () => {
      const directory = mkdtempSync(path.join(tmpdir(), "dsa-harness-"));
      const file = path.join(directory, "streams.py");
      writeFileSync(
        file,
        `${PYTHON_HARNESS}\nimport json as _j, sys as _s\n_before = (_s.stdout, _s.stderr)\nfor code in ["print(1)", "raise ValueError()", "while True: print('x' * 999)", "def f(:"]:\n    handle_request(_j.dumps({"kind": "program", "code": code}))\n_s.stdout.write("same" if (_s.stdout, _s.stderr) == _before else "changed")\n`,
      );
      expect(spawnSync("python3", ["-I", file], { encoding: "utf8" }).stdout).toBe("same");
    });
  });

  describe("running sample tests", () => {
    it("passes a correct solution on every case and reports the calls made", () => {
      const result = tests(lowerBound, "lower_bound", cases);
      expect(result.status).toBe("ok");
      expect(summariseTests(result)).toEqual({ total: 3, passed: 3, failed: 0, errors: 0, allPassed: true });
      expect(result.results[0]).toMatchObject({ index: 0, status: "passed", call: "lower_bound([1, 3, 3, 5, 8], 3)", expected: "1", actual: "1", error: null });
      expect(result.results.map((r) => r.durationMs >= 0)).toEqual([true, true, true]);
    });

    it("fails an incorrect solution, showing expected and actual values", () => {
      const result = tests("def lower_bound(items, target):\n    return 0\n", "lower_bound", cases);
      expect(result.results.map((r) => r.status)).toEqual(["failed", "failed", "passed"]);
      expect(result.results[1]).toMatchObject({ expected: "3", actual: "0" });
      expect(summariseTests(result)).toMatchObject({ passed: 1, failed: 2, allPassed: false });
    });

    it("runs no test when the code has a syntax error", () => {
      const result = tests("def lower_bound(items, target)\n    return 0\n", "lower_bound", cases);
      expect(result).toMatchObject({ status: "error", results: [] });
      expect(result.error).toMatchObject({ type: "SyntaxError", line: 1 });
    });

    it("reports a runtime exception for the case that raised it and still runs the others", () => {
      const code = "def lower_bound(items, target):\n    return items.index(target)\n";
      const result = tests(code, "lower_bound", cases);
      expect(result.results.map((r) => r.status)).toEqual(["passed", "error", "error"]);
      expect(result.results[1]).toMatchObject({ actual: null, error: { type: "ValueError", line: 2 } });
      expect(summariseTests(result)).toMatchObject({ passed: 1, failed: 0, errors: 2 });
    });

    it("explains a missing or renamed function", () => {
      const result = tests("def lowerbound(items, target):\n    return 0\n", "lower_bound", cases);
      expect(result.results.every((r) => r.status === "error")).toBe(true);
      expect(result.results[0]!.error).toMatchObject({ type: "NameError" });
      expect(result.results[0]!.error!.message).toContain("does not define a function named lower_bound()");
    });

    it("reports a function with the wrong parameters as a TypeError", () => {
      const result = tests("def lower_bound(items):\n    return 0\n", "lower_bound", cases);
      expect(result.results[0]).toMatchObject({ status: "error", error: { type: "TypeError" } });
      expect(result.results[0]!.error!.message).toMatch(/positional argument/);
    });

    it("rejects a name that is defined but is not a function", () => {
      const result = tests("lower_bound = 3\n", "lower_bound", cases);
      expect(result.results[0]!.error!.message).toContain("does not define a function");
    });

    it("gives every case a fresh namespace, so module state cannot carry over", () => {
      const code = "calls = []\n\ndef count(x):\n    calls.append(x)\n    return len(calls)\n";
      const result = tests(code, "count", [
        { args: [1], expected: 1 },
        { args: [2], expected: 1 },
        { args: [3], expected: 1 },
      ]);
      expect(result.results.map((r) => r.status)).toEqual(["passed", "passed", "passed"]);
    });

    it("rebuilds the arguments for every case, so a solution that mutates its input cannot affect the report", () => {
      const code = "def first(items):\n    items.sort()\n    items.append(99)\n    return items[0]\n";
      const result = tests(code, "first", [{ args: [[3, 1, 2]], expected: 1 }]);
      expect(result.results[0]).toMatchObject({ status: "passed", call: "first([3, 1, 2])" });
    });

    it("does not accept True for 1, 1 for True, or None for 0", () => {
      const result = tests("def f(x):\n    return x\n", "f", [
        { args: [1], expected: true },
        { args: [true], expected: 1 },
        { args: [null], expected: 0 },
        { args: [0], expected: false },
        { args: [true], expected: true },
        { args: [null], expected: null },
      ]);
      expect(result.results.map((r) => r.status)).toEqual(["failed", "failed", "failed", "failed", "passed", "passed"]);
      expect(result.results[0]).toMatchObject({ expected: "True", actual: "1" });
    });

    it("compares lists element by element and accepts a tuple where a list is expected", () => {
      const result = tests("def f(kind):\n    return {'list': [1, 2], 'tuple': (1, 2), 'short': [1], 'nested': [[1], [True]]}[kind]\n", "f", [
        { args: ["list"], expected: [1, 2] },
        { args: ["tuple"], expected: [1, 2] },
        { args: ["short"], expected: [1, 2] },
        { args: ["nested"], expected: [[1], [1]] },
      ]);
      expect(result.results.map((r) => r.status)).toEqual(["passed", "passed", "failed", "failed"]);
    });

    it("captures what a solution prints, per case, without confusing it with the return value", () => {
      const result = tests('def f(x):\n    print("debug", x)\n    return x * 2\n', "f", [
        { args: [2], expected: 4 },
        { args: [5], expected: 10 },
      ]);
      expect(result.results.map((r) => [r.status, r.stdout])).toEqual([
        ["passed", "debug 2\n"],
        ["passed", "debug 5\n"],
      ]);
    });

    it("stops a case that prints without end and carries on with the next", () => {
      const result = tests("def f(x):\n    while x:\n        print('y' * 80)\n    return 0\n", "f", [
        { args: [1], expected: 0 },
        { args: [0], expected: 0 },
      ]);
      expect(result.results.map((r) => r.status)).toEqual(["output_limit", "passed"]);
      expect(result.results[0]).toMatchObject({ truncated: true, actual: null });
    });

    it("survives a returned value that cannot be shown", () => {
      const code = "class Odd:\n    def __repr__(self):\n        raise RuntimeError('no repr')\n\ndef f():\n    return Odd()\n";
      const result = tests(code, "f", [{ args: [], expected: 1 }]);
      expect(result.results[0]!.status).toBe("failed");
      expect(result.results[0]!.actual).toContain("repr() failed");
    });

    it("shortens a very long returned value", () => {
      const result = tests("def f():\n    return list(range(5000))\n", "f", [{ args: [], expected: [] }]);
      expect(result.results[0]!.actual!.length).toBeLessThan(HARNESS_LIMITS.maxRepr + 60);
      expect(result.results[0]!.actual).toContain("more characters");
    });

    it("handles large integers exactly", () => {
      const code = "def integer_sqrt(n):\n    lo, hi = 0, n + 1\n    while hi - lo > 1:\n        mid = (lo + hi) // 2\n        if mid * mid <= n:\n            lo = mid\n        else:\n            hi = mid\n    return lo\n";
      // Sent as a string of digits in JSON, exactly as the page sends it.
      const child = spawnSync("python3", ["-I", script], {
        input: `{"kind":"tests","code":${JSON.stringify(code)},"functionName":"integer_sqrt","tests":[{"args":[1000000000000000000],"expected":1000000000},{"args":[999999999999999999],"expected":999999999}]}`,
        encoding: "utf8",
      });
      const result = JSON.parse(child.stdout) as TestsResult;
      expect(result.results.map((r) => r.status)).toEqual(["passed", "passed"]);
    });
  });

  describe("playground examples", () => {
    it.each(playgroundExamples.map((example) => [example.title, example] as const))("%s runs cleanly and prints something", (_title, example) => {
      const result = program(example.code);
      expect(result.error).toBeNull();
      expect(result.status).toBe("ok");
      expect(result.stdout.trim().length).toBeGreaterThan(0);
      expect(result.stderr).toBe("");
    });

    it("has the eight required examples, each explained", () => {
      expect(playgroundExamples.map((example) => example.id)).toEqual([
        "variables-and-types", "lists", "dictionaries", "loops", "functions", "recursion", "linear-search", "binary-search",
      ]);
      for (const example of playgroundExamples) expect(example.explanation.length).toBeGreaterThan(60);
    });
  });
});
