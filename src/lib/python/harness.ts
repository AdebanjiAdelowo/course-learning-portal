/**
 * The Python side of browser execution: a small program that runs inside Pyodide, takes one
 * JSON request and returns one JSON result.
 *
 * It is kept as source text because it is loaded into the interpreter at start-up. The same
 * text is run under ordinary CPython by the unit tests (tests/unit/python-harness.test.ts), so
 * its behaviour is checked without a browser.
 *
 * What it guarantees:
 *   - Every run and every test case executes the student's code in a brand-new namespace, so
 *     module-level state (globals, a mutated default list) never carries from one test to the
 *     next. Arguments are rebuilt from JSON for each call, so a solution that mutates its input
 *     cannot affect a later case.
 *   - Output is captured and capped. Going over the cap stops the program.
 *   - Any exception, including SyntaxError and SystemExit, becomes a structured error with a
 *     traceback limited to the student's own lines.
 *
 * What it does not guarantee: the interpreter itself is shared across runs, so a program that
 * modifies an imported standard-library module, or sys, affects later runs until the worker is
 * restarted. A loop that never ends cannot be interrupted from here: the page stops it by
 * terminating the worker.
 */
export const HARNESS_LIMITS = {
  /** Characters of combined standard output and standard error kept per run or test case. */
  maxOutput: 20_000,
  /** Characters of a result's repr shown for one test case. */
  maxRepr: 2_000,
} as const;

export const PYTHON_HARNESS = String.raw`
import io
import json
import linecache
import sys
import time
import traceback

USER_FILE = "solution.py"
MAX_OUTPUT = ${HARNESS_LIMITS.maxOutput}
MAX_REPR = ${HARNESS_LIMITS.maxRepr}


class OutputLimitExceeded(BaseException):
    """Raised inside print() when a program has produced too much output.

    It derives from BaseException so that a student's own "except Exception" cannot swallow it.
    """


class _Sink:
    def __init__(self):
        self.size = 0
        self.stdout = []
        self.stderr = []
        self.truncated = False


class _Stream(io.TextIOBase):
    def __init__(self, sink, parts):
        self._sink = sink
        self._parts = parts

    def writable(self):
        return True

    def write(self, text):
        text = str(text)
        room = MAX_OUTPUT - self._sink.size
        if len(text) > room:
            if room > 0:
                self._parts.append(text[:room])
                self._sink.size += room
            self._sink.truncated = True
            raise OutputLimitExceeded()
        self._parts.append(text)
        self._sink.size += len(text)
        return len(text)


def _no_input(prompt=""):
    raise RuntimeError(
        "input() is not available here: there is no keyboard attached to this program. "
        "Put the values in variables, or pass them to a function as arguments."
    )


def _short_repr(value):
    try:
        text = repr(value)
    except BaseException as error:  # a __repr__ that raises, or recursion
        return "<value whose repr() failed: " + type(error).__name__ + ">"
    if len(text) > MAX_REPR:
        return text[:MAX_REPR] + "... (" + str(len(text) - MAX_REPR) + " more characters)"
    return text


def _describe(error):
    """A structured description of an exception, showing only the student's own frames."""
    captured = traceback.TracebackException.from_exception(error)
    lines = []
    line_number = None
    if isinstance(error, SyntaxError):
        line_number = error.lineno
    else:
        frames = [frame for frame in captured.stack if frame.filename == USER_FILE]
        if frames:
            line_number = frames[-1].lineno
            lines.append("Traceback (most recent call last):\n")
            lines.extend(traceback.StackSummary.from_list(frames).format())
    lines.extend(captured.format_exception_only())
    text = "".join(lines)
    if len(text) > 6000:
        text = text[:3000] + "\n... (traceback shortened) ...\n" + text[-2500:]
    message = str(error)
    if isinstance(error, SyntaxError) and error.msg:
        message = error.msg
    return {
        "type": type(error).__name__,
        "message": message[:1000],
        "line": line_number,
        "traceback": text,
    }


def _compile(code):
    linecache.cache[USER_FILE] = (len(code), None, code.splitlines(True), USER_FILE)
    return compile(code, USER_FILE, "exec")


def _execute(action):
    """Runs action() with output captured. Returns (value, error, limit_hit, sink, seconds)."""
    sink = _Sink()
    saved = sys.stdout, sys.stderr
    sys.stdout = _Stream(sink, sink.stdout)
    sys.stderr = _Stream(sink, sink.stderr)
    value = None
    error = None
    limit_hit = False
    started = time.perf_counter()
    try:
        value = action()
    except OutputLimitExceeded:
        limit_hit = True
    except SystemExit as exit_request:
        # exit() and sys.exit() end the program normally unless they carry a failure code.
        if exit_request.code not in (None, 0):
            error = _describe(exit_request)
    except RecursionError as recursion:
        error = _describe(recursion)
        error["traceback"] = "RecursionError: " + str(recursion) + "\n"
    except BaseException as failure:
        error = _describe(failure)
    finally:
        seconds = time.perf_counter() - started
        sys.stdout, sys.stderr = saved
    return value, error, limit_hit, sink, seconds


def _namespace():
    return {"__name__": "__main__", "input": _no_input}


def run_program(code):
    try:
        compiled = _compile(code)
    except SyntaxError as error:
        return {"kind": "program", "status": "error", "stdout": "", "stderr": "", "truncated": False,
                "error": _describe(error), "durationMs": 0.0}
    _, error, limit_hit, sink, seconds = _execute(lambda: exec(compiled, _namespace()))
    status = "output_limit" if limit_hit else ("error" if error else "ok")
    return {"kind": "program", "status": status, "stdout": "".join(sink.stdout), "stderr": "".join(sink.stderr),
            "truncated": sink.truncated, "error": error, "durationMs": seconds * 1000}


def _same(actual, expected):
    """Equality that does not let True pass for 1, or [1.0] for [1]... but accepts a tuple for a list."""
    if isinstance(expected, bool) or isinstance(actual, bool):
        return isinstance(actual, bool) and isinstance(expected, bool) and actual == expected
    if isinstance(expected, list):
        if not isinstance(actual, (list, tuple)) or len(actual) != len(expected):
            return False
        return all(_same(a, e) for a, e in zip(actual, expected))
    if isinstance(expected, dict):
        if not isinstance(actual, dict) or actual.keys() != expected.keys():
            return False
        return all(_same(actual[key], expected[key]) for key in expected)
    if expected is None:
        return actual is None
    try:
        return bool(actual == expected)
    except BaseException:
        return False


def run_tests(code, function_name, tests):
    try:
        compiled = _compile(code)
    except SyntaxError as error:
        return {"kind": "tests", "status": "error", "error": _describe(error), "results": []}

    results = []
    for index, test in enumerate(tests):
        # A fresh namespace and freshly built arguments for every case.
        arguments = json.loads(json.dumps(test["args"]))
        expected = json.loads(json.dumps(test["expected"]))
        namespace = _namespace()

        def call():
            exec(compiled, namespace)
            function = namespace.get(function_name)
            if not callable(function):
                raise NameError(
                    "Your code does not define a function named " + function_name + "(). "
                    "Keep the name and parameters from the starter code."
                )
            return function(*arguments)

        value, error, limit_hit, sink, seconds = _execute(call)
        if limit_hit:
            status = "output_limit"
        elif error:
            status = "error"
        else:
            status = "passed" if _same(value, expected) else "failed"
        results.append({
            "index": index,
            "status": status,
            "call": function_name + "(" + ", ".join(_short_repr(a) for a in json.loads(json.dumps(test["args"]))) + ")",
            "expected": _short_repr(expected),
            "actual": None if (error or limit_hit) else _short_repr(value),
            "stdout": "".join(sink.stdout),
            "stderr": "".join(sink.stderr),
            "truncated": sink.truncated,
            "error": error,
            "durationMs": seconds * 1000,
        })
    return {"kind": "tests", "status": "ok", "error": None, "results": results}


def handle_request(request_json):
    request = json.loads(request_json)
    if request["kind"] == "tests":
        result = run_tests(request["code"], request["functionName"], request["tests"])
    else:
        result = run_program(request["code"])
    return json.dumps(result)
`;
