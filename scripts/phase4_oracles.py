"""Independent brute-force oracles for the Two Pointers and Sliding Window coding problems.

    python3 scripts/phase4_oracles.py --check   verify every tests.json against its oracle
    python3 scripts/phase4_oracles.py --write   regenerate tests.json (deterministic)

Each oracle examines every pair, triple or window directly and shares no logic with the
reference solutions in seed/problems/<slug>/solution.py. `--write` computes expected values
from the oracle only, so `python3 scripts/verify_content.py` then checks the reference
solutions against answers they did not produce. Uses only the standard library.
"""
from __future__ import annotations

import json
import random
import string
import sys
from collections import Counter
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROBLEMS = ROOT / "seed" / "problems"


# ---------------------------------------------------------------------------
# Oracles: direct enumeration, quadratic or cubic, used only for checking.
# ---------------------------------------------------------------------------

def pair_sum_sorted(values, target):
    pairs = [[i, j] for i, j in combinations(range(len(values)), 2) if values[i] + values[j] == target]
    assert len(pairs) <= 1, "contract: at most one index pair reaches the target"
    return pairs[0] if pairs else []


def dedupe_sorted(values):
    out = []
    for value in values:
        if value not in out:
            out.append(value)
    return out


def zeros_to_end(values):
    return [v for v in values if v != 0] + [0] * values.count(0)


def alnum_palindrome(text):
    kept = [c.lower() for c in text if c in string.ascii_letters + string.digits]
    return kept == kept[::-1]


def triplets_with_sum(values, target):
    found = {tuple(sorted((values[i], values[j], values[k]))) for i, j, k in combinations(range(len(values)), 3) if values[i] + values[j] + values[k] == target}
    return [list(t) for t in sorted(found)]


def max_container_area(heights):
    return max(((j - i) * min(heights[i], heights[j]) for i, j in combinations(range(len(heights)), 2)), default=0)


def best_window_sum(values, k):
    return max(sum(values[i:i + k]) for i in range(len(values) - k + 1))


def shortest_reaching_sum(values, target):
    lengths = [j - i for i in range(len(values)) for j in range(i + 1, len(values) + 1) if sum(values[i:j]) >= target]
    return min(lengths, default=0)


def longest_distinct_run(text):
    return max((j - i for i in range(len(text)) for j in range(i + 1, len(text) + 1) if len(set(text[i:j])) == j - i), default=0)


def contains_permutation(pattern, text):
    m = len(pattern)
    return any(Counter(text[i:i + m]) == Counter(pattern) for i in range(len(text) - m + 1))


def smallest_covering_window(text, pattern):
    need = Counter(pattern)
    best = ""
    for length in range(len(pattern), len(text) + 1):
        for i in range(len(text) - length + 1):
            window = Counter(text[i:i + length])
            if all(window[c] >= n for c, n in need.items()):
                return text[i:i + length]
    return best


def longest_run_after_replacements(text, k):
    return max((j - i for i in range(len(text)) for j in range(i + 1, len(text) + 1) if (j - i) - max(Counter(text[i:j]).values()) <= k), default=0)


# ---------------------------------------------------------------------------
# Cases: hand-picked samples (shown to students) and hidden edge and random cases.
# ---------------------------------------------------------------------------

def rng(seed):
    return random.Random(seed)


def pair_cases():
    samples = [([1, 3, 4, 6, 9], 12), ([2, 5, 8], 4), ([-4, -1, 0, 7], -5)]
    hidden = [([], 3), ([5], 10), ([2, 2], 4), ([0, 0], 1), ([-3, 3], 0), ([1, 2], 3), ([1, 4, 5, 9], 13), ([1, 2, 3, 4], 9), ([1, 2, 3, 4], 2),
              ([-10, -2, 5, 11], 1), ([1000, 1000], 2000), ([-1000, 999], -1)]
    r = rng(51)
    while len(hidden) < 30:
        values = sorted(r.randint(-60, 60) for _ in range(r.randint(2, 40)))
        i, j = sorted(r.sample(range(len(values)), 2))
        target = values[i] + values[j] if r.random() < 0.7 else r.randint(-130, 130)
        if sum(1 for a, b in combinations(range(len(values)), 2) if values[a] + values[b] == target) <= 1:
            hidden.append((values, target))
    return samples, hidden


def dedupe_cases():
    samples = [([1, 1, 2, 3, 3],), ([],), ([-2, -2, -2],)]
    hidden = [([7],), ([1, 2, 3],), ([0, 0, 1, 1, 2, 2],), ([-5, -5, 0, 4, 4, 4, 9],), ([5, 5],), ([-1000, 1000],)]
    r = rng(52)
    while len(hidden) < 24:
        hidden.append((sorted(r.randint(-20, 20) for _ in range(r.randint(0, 60))),))
    hidden.append(([3] * 100,))
    return samples, hidden


def zeros_cases():
    samples = [([0, 3, 0, 5, 7],), ([],), ([4, 0, 0],)]
    hidden = [([0],), ([9],), ([0, 0, 0],), ([1, 2, 3],), ([0, -1, 0, -1],), ([-4, 0, 6, 0, 0, 2],)]
    r = rng(53)
    while len(hidden) < 24:
        hidden.append(([0 if r.random() < 0.4 else r.randint(-50, 50) for _ in range(r.randint(1, 80))],))
    hidden.append(([0] * 50 + [1] * 50,))
    return samples, hidden


def palindrome_cases():
    samples = [("No lemon, no melon",), ("race a car",), ("",)]
    hidden = [("a",), ("!!",), ("Ab",), ("0P",), ("Was it a car or a cat I saw?",), ("Step on no pets",), ("12321",), ("12 3 4 21",),
              ("A man, a plan, a canal: Panama",), ("abcCBA",), (".,;:",), ("ab_a",)]
    r = rng(54)
    alphabet = "abcAB12 ,.!"
    while len(hidden) < 26:
        half = "".join(r.choice(alphabet) for _ in range(r.randint(0, 20)))
        text = half + half[::-1] if r.random() < 0.5 else half + r.choice(alphabet) + half
        if r.random() < 0.3:
            text = text[:max(0, len(text) // 2 - 1)] + "z" + text[len(text) // 2:]
        hidden.append((text,))
    return samples, hidden


def triplet_cases():
    samples = [([-2, 0, 1, 1, 2], 0), ([1, 2, 3], 7), ([0, 0, 0, 0], 0)]
    hidden = [([], 0), ([1, 2], 3), ([3, 3, 3], 9), ([-1, 0, 1, 2, -1, -4], 0), ([5, -5, 0, 5, -5], 5), ([1, 1, 1, 2, 2], 4), ([-3, -2, -1], -6), ([10, 20, 30], 61)]
    r = rng(55)
    while len(hidden) < 24:
        hidden.append(([r.randint(-12, 12) for _ in range(r.randint(3, 40))], r.randint(-6, 6)))
    return samples, hidden


def container_cases():
    samples = [([1, 8, 6, 2, 5, 4, 8, 3, 7],), ([1, 1],), ([4, 3, 2, 1, 4],)]
    hidden = [([],), ([5],), ([0, 0],), ([0, 9],), ([2, 3, 4, 5, 18, 17, 6],), ([10, 0, 0, 0, 10],), ([1, 2, 3, 4, 5, 6],), ([6, 5, 4, 3, 2, 1],)]
    r = rng(56)
    while len(hidden) < 26:
        hidden.append(([r.randint(0, 10000) for _ in range(r.randint(2, 100))],))
    return samples, hidden


def fixed_window_cases():
    samples = [([2, 1, 5, 1, 3, 2], 3), ([-4, -2, -7], 2), ([6], 1)]
    hidden = [([1, 2, 3], 3), ([5, -1, 5], 1), ([-1, -1, -1, -1], 4), ([0, 0, 0], 2), ([3, -10, 4, 4, -10, 3], 2), ([-1000, 1000, -1000], 2)]
    r = rng(57)
    while len(hidden) < 26:
        values = [r.randint(-1000, 1000) for _ in range(r.randint(1, 100))]
        hidden.append((values, r.randint(1, len(values))))
    return samples, hidden


def shortest_cases():
    samples = [([2, 3, 1, 2, 4, 3], 7), ([1, 1, 1], 5), ([8], 3)]
    hidden = [([], 1), ([1], 1), ([1], 2), ([5, 1, 1, 1, 5], 10), ([1, 2, 3, 4, 5], 11), ([1, 2, 3, 4, 5], 15), ([1, 2, 3, 4, 5], 16), ([10000] * 3, 10001)]
    r = rng(58)
    while len(hidden) < 26:
        values = [r.randint(1, 30) for _ in range(r.randint(1, 100))]
        hidden.append((values, r.randint(1, max(1, sum(values)) + 20)))
    return samples, hidden


def distinct_cases():
    samples = [("abcabcbb",), ("",), ("bbbb",)]
    hidden = [("a",), ("ab",), ("abba",), ("dvdf",), ("pwwkew",), ("tmmzuxt",), (" ",), ("a b c a",), ("0123456789",), ("AaBbAa",)]
    r = rng(59)
    while len(hidden) < 26:
        hidden.append(("".join(r.choice("abcdeAB1 ") for _ in range(r.randint(1, 120))),))
    return samples, hidden


def permutation_cases():
    samples = [("ab", "eidbaooo"), ("ab", "eidboaoo"), ("abc", "ab")]
    hidden = [("a", "a"), ("a", "b"), ("aa", "aba"), ("aab", "baa"), ("abc", "cba"), ("abc", "xxcab"), ("hello", "ooolleoooleh"), ("adc", "dcda"), ("z", "")]
    r = rng(60)
    while len(hidden) < 26:
        text = "".join(r.choice("abcd") for _ in range(r.randint(0, 150)))
        if text and r.random() < 0.6:
            i = r.randrange(len(text))
            piece = text[i:i + r.randint(1, 6)]
            pattern = "".join(r.sample(piece, k=len(piece)))
        else:
            pattern = "".join(r.choice("abcd") for _ in range(r.randint(1, 6)))
        hidden.append((pattern, text))
    return samples, hidden


def covering_cases():
    samples = [("ADOBECODEBANC", "ABC"), ("a", "aa"), ("xyz", "z")]
    hidden = [("a", "a"), ("", "a"), ("aa", "aa"), ("ab", "b"), ("bba", "ab"), ("abcabc", "cab"), ("acbbaca", "aba"), ("AaBbCc", "abc"), ("cabwefgewcwaefgcf", "cae")]
    r = rng(61)
    while len(hidden) < 26:
        text = "".join(r.choice("abcxyz") for _ in range(r.randint(1, 120)))
        pattern = "".join(r.choice("abcx") for _ in range(r.randint(1, 5)))
        hidden.append((text, pattern))
    return samples, hidden


def replacement_cases():
    samples = [("ABAB", 2), ("AABABBA", 1), ("ABCD", 0)]
    hidden = [("", 0), ("A", 0), ("A", 1), ("AAAA", 0), ("ABBB", 0), ("ABCDE", 5), ("BAAAB", 2), ("ABAA", 0), ("AAABBBAAA", 3)]
    r = rng(62)
    while len(hidden) < 26:
        text = "".join(r.choice("ABC") for _ in range(r.randint(1, 120)))
        hidden.append((text, r.randint(0, min(10, len(text)))))
    return samples, hidden


# ---------------------------------------------------------------------------
# Contracts: every case must satisfy the constraints stated in its problem.md.
# ---------------------------------------------------------------------------

def ints(values, low, high, max_len):
    return isinstance(values, list) and len(values) <= max_len and all(isinstance(v, int) and not isinstance(v, bool) and low <= v <= high for v in values)


def ascii_text(text, max_len, alphabet=None):
    return isinstance(text, str) and len(text) <= max_len and all((32 <= ord(c) < 127) if alphabet is None else c in alphabet for c in text)


LETTERS = string.ascii_letters
CONTRACTS = {
    "pair-sum-sorted": lambda v, t: ints(v, -1000, 1000, 100) and v == sorted(v) and isinstance(t, int),
    "dedupe-sorted": lambda v: ints(v, -1000, 1000, 100) and v == sorted(v),
    "zeros-to-end": lambda v: ints(v, -1000, 1000, 100),
    "alnum-palindrome": lambda t: ascii_text(t, 200),
    "triplets-with-sum": lambda v, t: ints(v, -1000, 1000, 60) and isinstance(t, int),
    "widest-container": lambda h: ints(h, 0, 10000, 100),
    "best-window-sum": lambda v, k: ints(v, -1000, 1000, 100) and len(v) >= 1 and isinstance(k, int) and 1 <= k <= len(v),
    "shortest-reaching-sum": lambda v, t: ints(v, 1, 10000, 100) and isinstance(t, int) and 1 <= t <= 1_000_000,
    "longest-distinct-run": lambda t: ascii_text(t, 200),
    "permutation-in-text": lambda p, t: ascii_text(p, 26, string.ascii_lowercase) and len(p) >= 1 and ascii_text(t, 200, string.ascii_lowercase),
    "smallest-covering-window": lambda t, p: ascii_text(t, 200, LETTERS) and ascii_text(p, 50, LETTERS) and len(p) >= 1,
    "longest-run-after-replacements": lambda t, k: ascii_text(t, 200, string.ascii_uppercase) and isinstance(k, int) and 0 <= k <= len(t),
}


REGISTRY = {
    "pair-sum-sorted": ("pair_sum_sorted", pair_sum_sorted, pair_cases),
    "dedupe-sorted": ("dedupe_sorted", dedupe_sorted, dedupe_cases),
    "zeros-to-end": ("zeros_to_end", zeros_to_end, zeros_cases),
    "alnum-palindrome": ("alnum_palindrome", alnum_palindrome, palindrome_cases),
    "triplets-with-sum": ("triplets_with_sum", triplets_with_sum, triplet_cases),
    "widest-container": ("max_container_area", max_container_area, container_cases),
    "best-window-sum": ("best_window_sum", best_window_sum, fixed_window_cases),
    "shortest-reaching-sum": ("shortest_reaching_sum", shortest_reaching_sum, shortest_cases),
    "longest-distinct-run": ("longest_distinct_run", longest_distinct_run, distinct_cases),
    "permutation-in-text": ("contains_permutation", contains_permutation, permutation_cases),
    "smallest-covering-window": ("smallest_covering_window", smallest_covering_window, covering_cases),
    "longest-run-after-replacements": ("longest_run_after_replacements", longest_run_after_replacements, replacement_cases),
}


def build(slug):
    function, oracle, cases = REGISTRY[slug]
    samples, hidden = cases()
    seen = {json.dumps(list(args)) for args in samples}
    unique_hidden = []
    for args in hidden:
        key = json.dumps(list(args))
        if key not in seen:
            seen.add(key)
            unique_hidden.append(args)
    entry = lambda args: {"args": json.loads(json.dumps(list(args))), "expected": oracle(*json.loads(json.dumps(list(args))))}
    return {"function": function, "sample": [entry(a) for a in samples], "hidden": [entry(a) for a in unique_hidden]}


def main(argv):
    mode = argv[1] if len(argv) > 1 else "--check"
    failures = []
    cases = 0
    for slug, (function, oracle, _) in REGISTRY.items():
        path = PROBLEMS / slug / "tests.json"
        if mode == "--write":
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(build(slug), indent=2) + "\n", encoding="utf-8")
        spec = json.loads(path.read_text(encoding="utf-8"))
        if spec["function"] != function:
            failures.append(f"{slug}: function is {spec['function']}, expected {function}")
        for case in spec["sample"] + spec["hidden"]:
            cases += 1
            if not CONTRACTS[slug](*json.loads(json.dumps(case["args"]))):
                failures.append(f"{slug}: {case['args']} violates the stated contract")
            got = oracle(*json.loads(json.dumps(case["args"])))
            if got != case["expected"]:
                failures.append(f"{slug}: {case['args']} expected {case['expected']!r} but the oracle gives {got!r}")
    for failure in failures:
        print(failure)
    print(f"{'FAILED' if failures else 'OK'}: {cases} cases across {len(REGISTRY)} problems checked against brute-force oracles.")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
