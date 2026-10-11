import type { SeedModule } from "./types";

/**
 * The two Python foundations modules: the Python this course is written in, and no more.
 *
 * Lesson bodies are in `seed/lessons`, coding problems in `seed/problems`. Text containing
 * LaTeX or backslashes uses String.raw.
 */
const md = String.raw;

const tutorial = "https://docs.python.org/3/tutorial/";

export const pythonEssentials: SeedModule = {
  slug: "python-essentials",
  title: "Python essentials: values, control flow and functions",
  description:
    "Values and types, operators, conditions, loops, functions and strings, taught through small algorithmic tasks you can run in the browser.",
  requiresPrevious: false,
  lessons: [
    {
      slug: "values-variables-and-types",
      title: "Values, variables and data types",
      summary: "What a value, a type and a variable are, and what an assignment does and does not do.",
      durationMinutes: 35,
      objectives: [
        "Distinguish a value, its type, and a name that refers to it",
        "Trace a sequence of assignments in a table of names and values",
        "Convert between int, float and str, and predict the result",
        "Explain why integers are exact and floats are approximate",
      ],
      resources: [
        {
          title: "The Python Tutorial: an informal introduction to Python",
          description: "Section 3 of the official tutorial covers numbers and text with many small examples.",
          kind: "reading",
          url: `${tutorial}introduction.html`,
        },
      ],
    },
    {
      slug: "operators-and-expressions",
      title: "Operators and expressions",
      summary: "Arithmetic and comparison operators, floor division and remainder, and the order of evaluation.",
      durationMinutes: 35,
      objectives: [
        "State the identity that connects floor division and remainder",
        "Predict // and % for positive and negative operands",
        "Extract and remove the last digit of an integer",
        "Apply operator precedence, and add brackets to make it visible",
      ],
    },
    {
      slug: "conditionals",
      title: "Conditionals and boolean logic",
      summary: "if, elif and else; and, or and not; short-circuit evaluation; and getting boundaries right.",
      durationMinutes: 40,
      objectives: [
        "Say which branch of an if, elif, else chain runs for a given input",
        "Combine conditions with and, or and not, and negate them with De Morgan's laws",
        "Explain short-circuit evaluation and why the order of two tests can matter",
        "Choose test inputs that exercise every branch and every boundary",
      ],
      resources: [
        {
          title: "The Python Tutorial: more control flow tools",
          description: "Section 4 covers if, for, range, break and continue, and defining functions.",
          kind: "reading",
          url: `${tutorial}controlflow.html`,
        },
      ],
    },
    {
      slug: "loops-and-iteration",
      title: "Loops and iteration",
      summary: "for, while and range; accumulators; tracing a loop; and arguing that a loop ends.",
      durationMinutes: 45,
      objectives: [
        "List the values produced by range with one, two and three arguments",
        "Choose between for and while and justify the choice",
        "Trace a loop in a table, one row per iteration",
        "Argue that a while loop terminates by naming a quantity that shrinks",
      ],
    },
    {
      slug: "functions-and-parameters",
      title: "Functions and parameters",
      summary: "Defining and calling functions, returning versus printing, local variables, and docstrings as contracts.",
      durationMinutes: 45,
      objectives: [
        "Tell a parameter from an argument, and returning from printing",
        "State a precondition and a postcondition in a docstring",
        "Predict the scope of a local variable",
        "Test a function against a slower method that is obviously correct",
      ],
    },
    {
      slug: "strings-and-input-output",
      title: "Strings and basic input and output",
      summary: "Indexing, slicing and immutability; building strings efficiently; formatting output; and why data arrives as arguments.",
      durationMinutes: 45,
      objectives: [
        "Index and slice a string, including with negative indices",
        "Explain immutability and what it costs when building a string in a loop",
        "Format values with an f-string",
        "Explain why a problem's data arrives as function arguments and not from input()",
      ],
      resources: [
        {
          title: "Python documentation: string methods",
          description: "Every method available on a string, with examples.",
          kind: "link",
          url: "https://docs.python.org/3/library/stdtypes.html#string-methods",
        },
      ],
    },
  ],
  quiz: {
    slug: "python-essentials-quiz",
    title: "Assessment: Python essentials",
    description: "Ten questions on values, operators, conditions, loops, functions and strings.",
    passPercent: 70,
    questions: [
      {
        type: "multiple_choice",
        prompt: md`What is the value of ${"`-7 // 2`"} in Python?`,
        options: [md`${"`-3`"}`, md`${"`-4`"}`, md`${"`-3.5`"}`, md`${"`3`"}`],
        answer: 1,
        explanation: md`Floor division rounds **down**, towards minus infinity, not towards zero. $-7 / 2 = -3.5$, and the largest integer not above it is $-4$. The identity still holds: $-7 = (-4) \cdot 2 + 1$, so ${"`-7 % 2`"} is 1.`,
      },
      {
        type: "short_answer",
        prompt: md`What does ${"`4729 % 10`"} evaluate to? Answer with a number.`,
        accepted: ["9"],
        explanation: md`The remainder on division by 10 is the last decimal digit: $4729 = 472 \cdot 10 + 9$.`,
      },
      {
        type: "true_false",
        prompt: md`After the lines ${"`a = 5`"}, ${"`b = a`"} and ${"`a = a + 2`"}, the value of ${"`b`"} is 7.`,
        answer: false,
        explanation: md`${"`b = a`"} ties the name ${"`b`"} to the value 5. The third line computes 7 and moves the name ${"`a`"} to it. Nothing links the two names, and the integer 5 itself cannot change, so ${"`b`"} is still 5.`,
      },
      {
        type: "multiple_choice",
        prompt: md`How many times does the body of ${"`for i in range(2, 11, 3):`"} run?`,
        options: ["2", "3", "4", "9"],
        answer: 1,
        explanation: md`The values are 2, 5 and 8. The next would be 11, and the stop value is never included.`,
      },
      {
        type: "multiple_select",
        prompt: "Which of these expressions evaluate to True? Select all that apply.",
        options: [md`${"`7 / 2 == 3.5`"}`, md`${"`0.1 + 0.2 == 0.3`"}`, md`${"`\"7\" + \"7\" == \"77\"`"}`, md`${"`int(3.9) == 4`"}`, md`${"`2 ** 3 ** 2 == 512`"}`],
        answers: [0, 2, 4],
        explanation: md`True division gives 3.5. Adding strings concatenates them. Powers group from the right, so the last is $2^{9} = 512$. The float sum is not exactly 0.3, because 0.1 and 0.2 cannot be stored exactly in binary. ${"`int`"} cuts off towards zero, so ${"`int(3.9)`"} is 3.`,
        points: 2,
      },
      {
        type: "multiple_choice",
        prompt: md`With ${"`items = []`"} and ${"`i = 0`"}, what happens when Python evaluates ${"`i < len(items) and items[i] == 7`"}?`,
        options: [
          "It raises an IndexError, because items[0] does not exist",
          "It evaluates to False, and items[i] is never read",
          "It evaluates to True",
          "It evaluates to None",
        ],
        answer: 1,
        explanation: md`${"`and`"} evaluates its left side first. ${"`0 < 0`"} is false, so the result is already known and the right side is skipped. This short-circuit behaviour is what makes the guard safe. With the two tests the other way round, it would raise an ${"`IndexError`"}.`,
      },
      {
        type: "true_false",
        prompt: "A function that prints its answer and has no return statement returns None.",
        answer: true,
        explanation: md`Printing shows text to a person. Without a ${"`return`"}, the call itself evaluates to ${"`None`"}, so the caller cannot use the answer and an automatic test cannot check it.`,
      },
      {
        type: "short_answer",
        prompt: md`For ${"`s = \"search\"`"}, what is ${"`s[1:4]`"}? Answer with the letters only, without quotes.`,
        accepted: ["ear"],
        explanation: md`A slice runs from the start index up to but not including the stop index: positions 1, 2 and 3, which hold e, a and r.`,
      },
      {
        type: "multiple_choice",
        prompt: md`A loop begins ${"`while n != 0:`"} and its body is ${"`n -= 2`"}. For which starting value of ${"`n`"} does it never end?`,
        options: ["8", "0", "7", "100"],
        answer: 2,
        explanation: md`Starting from 7 the values are 5, 3, 1, -1, -3, ... The loop steps over 0 without ever equalling it. Writing the condition as ${"`n > 0`"} guarantees termination for every start.`,
      },
      {
        type: "multiple_select",
        prompt: "Which statements about Python strings are true? Select all that apply.",
        options: [
          "A string can be changed in place by assigning to one of its positions",
          "s.upper() returns a new string and leaves s as it was",
          "Building a long string with += in a loop can take time proportional to the square of its length",
          "input() returns a number when the user types digits",
          "The slice s[2:2] is an empty string, not an error",
        ],
        answers: [1, 2, 4],
        explanation: md`Strings are immutable: methods return new strings, and assigning to a position is a ${"`TypeError`"}. Each ${"`+=`"} may copy everything built so far, which adds up to quadratic work. ${"`input()`"} always returns text. A slice with equal start and stop is empty.`,
        points: 2,
      },
    ],
  },
  project: {
    slug: "text-statistics",
    title: "A small text-statistics library",
    summary: "Six tested functions that analyse numbers and text, using only what Python Module P1 teaches.",
    description: md`Write a small library of functions, each with a docstring and tests. The aim is not the functions themselves, which are simple, but the habits: a precise contract, deliberate test cases and a trace you can explain.

Implement, in one file:

1. **${"`digit_count(n)`"}**: the number of decimal digits of an integer $n \ge 0$. Note that 0 has one digit.
2. **${"`is_prime(n)`"}**: whether $n$ is prime, for any integer $n$. Numbers below 2 are not prime.
3. **${"`collatz_steps(n)`"}**: for $n \ge 1$, how many steps the rule "halve if even, otherwise triple and add one" takes to reach 1.
4. **${"`count_vowels(text)`"}**: how many of the characters are vowels, ignoring case.
5. **${"`longest_word(text)`"}**: the longest word in a sentence, and the first such word if there is a tie.
6. **${"`caesar_shift(text, k)`"}**: each lower-case letter moved ${"`k`"} places along the alphabet, wrapping round from z to a. Other characters are unchanged.

For every function, write the docstring first, including its precondition. Then write the tests, then the code.

For **one** function with a loop, include a hand-made trace table for a small input, and a sentence saying why the loop ends.`,
    objectives: [
      "Write a docstring that states a precondition and what is returned",
      "Choose test cases by category: typical, smallest, boundary, and inputs outside the obvious",
      "Use //, % and a while loop to work with the digits of a number",
      "Process a string with indexing, a loop and string methods",
      "Trace a loop by hand and explain why it terminates",
    ],
    requirements: [
      "All six functions, each returning its result and printing nothing",
      "A docstring for each function, stating the precondition where there is one",
      "At least five assertions per function, including the smallest valid input and one boundary case",
      "A trace table for one function, written as a comment or in a separate text file",
      "The file runs from top to bottom without error using only the Python standard library",
    ],
    submissionInstructions:
      "Submit a link to a repository or a shared file. It must run with one documented command, such as python3 text_statistics.py, and finish silently or print a short confirmation when every assertion passes.",
    rubric: [
      { criterion: "Correctness", description: "Each function meets its contract, including for the edge cases named in the brief.", points: 35 },
      { criterion: "Testing", description: "Test cases are chosen deliberately and cover smallest inputs and boundaries.", points: 30 },
      { criterion: "Contracts", description: "Docstrings state what is required and what is returned, precisely.", points: 15 },
      { criterion: "Trace and explanation", description: "The trace is accurate and the termination argument is sound.", points: 20 },
    ],
    dueInDays: 14,
    resources: [
      {
        title: "PEP 8: style guide for Python code",
        description: "The conventions for naming and layout used throughout this course.",
        kind: "reading",
        url: "https://peps.python.org/pep-0008/",
      },
    ],
  },
  problems: [
    {
      slug: "split-duration",
      title: "Split a duration",
      summary: "Turn a number of seconds into hours, minutes and seconds with floor division and remainder.",
      difficulty: "warm_up",
      constraints: ["0 ≤ total_seconds ≤ 10^9", "Return a list of three integers: [hours, minutes, seconds]", "Integer arithmetic only"],
      hints: [
        "How many whole hours fit into the total? Which operator answers that directly?",
        "After removing the whole hours, what is left? There is an operator for the leftover too.",
        "Apply the same two steps to the leftover, with 60 in place of 3600.",
      ],
    },
    {
      slug: "leap-year",
      title: "Leap year",
      summary: "Combine three divisibility tests into one condition.",
      difficulty: "warm_up",
      constraints: ["1 ≤ year ≤ 10^6", "Return a bool, not a string or a number"],
      hints: [
        "Write each part of the rule as a condition using the remainder operator.",
        "Make a table with one row for each kind of year: not divisible by 4; divisible by 4 only; by 100 but not 400; by 400.",
        "A leap year is divisible by 4 and not by 100, or it is divisible by 400. Use brackets to make the grouping clear.",
      ],
    },
    {
      slug: "sum-of-digits",
      title: "Sum of digits",
      summary: "Add up the decimal digits of an integer with a while loop.",
      difficulty: "core",
      constraints: ["0 ≤ n ≤ 2^53", "Use arithmetic in a loop; do not convert n to a string"],
      hints: [
        "Which expression gives the last digit of n? Which removes it?",
        "Keep a running total. On each pass, add the last digit and then remove it.",
        "The loop should run while there are digits left. What value does n have when none are left? Check that your condition is false at exactly that point.",
      ],
    },
    {
      slug: "count-multiples",
      title: "Count the multiples",
      summary: "Count the multiples of d in an inclusive range, taking care with the ends.",
      difficulty: "core",
      constraints: ["-10^4 ≤ low, high ≤ 10^4", "1 ≤ d ≤ 10^4", "Both ends of the range are included", "If low > high the answer is 0"],
      hints: [
        "A number n is a multiple of d exactly when n % d == 0.",
        "range(low, high) stops before high. What must the stop value be for high itself to be visited?",
        "What does your range produce when low is greater than high? Check that the function then returns 0 without a special case.",
      ],
    },
  ],
};

export const pythonCollections: SeedModule = {
  slug: "python-collections-and-testing",
  title: "Python for algorithms: collections, mutability and testing",
  description:
    "Lists, tuples, dictionaries and sets with the cost of each operation; references and mutability; recursion; testing, debugging and writing efficient functions.",
  requiresPrevious: false,
  lessons: [
    {
      slug: "lists-and-tuples",
      title: "Lists and tuples",
      summary: "The two sequence types, how a list is stored, and what each list operation costs.",
      durationMinutes: 50,
      objectives: [
        "Say which list operations take constant time and which take linear time, and why",
        "Distinguish sorted(items) from items.sort()",
        "Choose between a list and a tuple for a given purpose",
        "Build a table as a list of lists without sharing rows",
      ],
      resources: [
        {
          title: "Python Wiki: time complexity of the built-in collections",
          description: "The reference table for what each list, set and dictionary operation costs.",
          kind: "link",
          url: "https://wiki.python.org/moin/TimeComplexity",
        },
      ],
    },
    {
      slug: "dictionaries-and-sets",
      title: "Dictionaries and sets",
      summary: "Constant-time lookup by hashing, the counting and grouping patterns, and trading memory for time.",
      durationMinutes: 50,
      objectives: [
        "Explain in outline why looking up a key does not require scanning",
        "Write the counting pattern and the grouping pattern",
        "Say which values can be dictionary keys and why",
        "Replace a quadratic search for duplicates by a linear one using a set",
      ],
      resources: [
        {
          title: "The Python Tutorial: data structures",
          description: "Section 5 covers lists, tuples, sets and dictionaries.",
          kind: "reading",
          url: `${tutorial}datastructures.html`,
        },
      ],
    },
    {
      slug: "references-identity-and-mutability",
      title: "References, identity and mutability",
      summary: "Why assignment never copies, how aliases arise, equality versus identity, and what a function can change.",
      durationMinutes: 50,
      objectives: [
        "Explain why changing a list through one name is visible through another",
        "Distinguish equality (==) from identity (is)",
        "Predict whether a function call can change its argument",
        "Make shallow and deep copies, and say what a shallow copy still shares",
      ],
    },
    {
      slug: "recursion-basics",
      title: "Recursion",
      summary: "Base case and recursive case, the call stack, recursion versus iteration, and fast exponentiation.",
      durationMinutes: 50,
      objectives: [
        "Identify the base case and the recursive case of a function",
        "Explain why each recursive call must be on a strictly smaller input",
        "Trace the call stack of a small recursive call",
        "Decide when recursion is the better tool and when a loop is",
      ],
    },
    {
      slug: "debugging-and-testing",
      title: "Basic debugging and testing",
      summary: "Kinds of error, reading a traceback, choosing test cases by category, and a method for finding a bug.",
      durationMinutes: 45,
      objectives: [
        "Read a traceback and say what went wrong and where",
        "List the categories of test case for a function on a sequence",
        "Check a function against a slower, obviously correct one",
        "Apply a five-step method to find and fix a bug",
      ],
      resources: [
        {
          title: "The Python Tutorial: errors and exceptions",
          description: "Section 8 explains syntax errors, exceptions and how to read what Python reports.",
          kind: "reading",
          url: `${tutorial}errors.html`,
        },
      ],
    },
    {
      slug: "efficient-python-functions",
      title: "Writing efficient Python functions",
      summary: "Why a line is not a unit of work, the hidden linear-time operations, and the standard ways to remove them.",
      durationMinutes: 50,
      objectives: [
        "Name Python operations that look like one step and take linear time",
        "Spot a linear operation inside a loop and estimate the total cost",
        "Replace a repeated list search with a set or dictionary lookup",
        "Explain the trade between running time and memory",
      ],
    },
  ],
  quiz: {
    slug: "python-collections-quiz",
    title: "Assessment: Python for algorithms",
    description: "Ten questions on collections, mutability, recursion, testing and the cost of Python operations.",
    passPercent: 70,
    questions: [
      {
        type: "multiple_choice",
        prompt: md`After ${"`a = [1, 2, 3]`"}, ${"`b = a`"} and ${"`b.append(4)`"}, what is ${"`a`"}?`,
        options: [md`${"`[1, 2, 3]`"}`, md`${"`[1, 2, 3, 4]`"}`, md`${"`[4, 1, 2, 3]`"}`, "It raises an error"],
        answer: 1,
        explanation: md`${"`b = a`"} does not copy. Both names refer to the same list, so a change made through ${"`b`"} is visible through ${"`a`"}. To get an independent list, write ${"`b = list(a)`"}.`,
      },
      {
        type: "true_false",
        prompt: md`For two lists ${"`x`"} and ${"`y`"}, if ${"`x == y`"} is True then ${"`x is y`"} must also be True.`,
        answer: false,
        explanation: md`${"`==`"} compares content and ${"`is`"} compares identity. ${"`[1, 2] == [1, 2]`"} is True, but the two lists are separate objects, so ${"`is`"} is False. The reverse does hold: the same object is always equal to itself.`,
      },
      {
        type: "multiple_select",
        prompt: md`For a list ${"`items`"} of length $n$, which operations take time proportional to $n$ in the worst case? Select all that apply.`,
        options: [md`${"`items[n // 2]`"}`, md`${"`x in items`"}`, md`${"`items.append(x)`"}`, md`${"`items.pop(0)`"}`, md`${"`items[1:]`"}`, md`${"`len(items)`"}`],
        answers: [1, 3, 4],
        explanation: md`Membership scans the list, removing the first element shifts every other one, and a slice copies its elements. Indexing, ${"`len`"} and ${"`append`"} at the end do not depend on $n$ (for ${"`append`"}, on average).`,
        points: 2,
      },
      {
        type: "short_answer",
        prompt: md`What does ${"`len({3, 1, 3, 2, 1})`"} evaluate to? Answer with a number.`,
        accepted: ["3"],
        explanation: md`A set holds distinct values only: $\{1, 2, 3\}$.`,
      },
      {
        type: "multiple_choice",
        prompt: "Which of these can be used as a dictionary key?",
        options: [md`${"`[1, 2]`"}`, md`${"`(1, 2)`"}`, md`${"`{1, 2}`"}`, md`${"`{\"a\": 1}`"}`],
        answer: 1,
        explanation: md`Keys must be hashable, which in practice means immutable. A tuple of numbers is immutable. Lists, sets and dictionaries can change, so their hash could change and the key could no longer be found.`,
      },
      {
        type: "multiple_choice",
        prompt: md`A recursive function ${"`f(n)`"} has the base case ${"`if n == 0: return 1`"} and otherwise returns ${"`n * f(n - 2)`"}. What happens for ${"`f(5)`"}?`,
        options: ["It returns 15", "It returns 0", "It never reaches the base case and raises a RecursionError", "It returns 120"],
        answer: 2,
        explanation: md`The arguments are 5, 3, 1, -1, -3, ... The value 0 is stepped over. Each call is on a smaller input, but that is not enough: the calls must reach a base case. Testing ${"`n <= 0`"} would fix it.`,
      },
      {
        type: "short_answer",
        prompt: md`A function computes ${"`power(base, exponent)`"} by squaring the half power when the exponent is even, and multiplying once when it is odd. How many calls does it make for exponent 8, counting the first call and the call with exponent 0? Answer with a number.`,
        accepted: ["5", "five"],
        explanation: md`The exponents are 8, 4, 2, 1 and 0: five calls. Repeated multiplication would need eight. The saving grows quickly: an exponent of one million needs 27 calls.`,
      },
      {
        type: "true_false",
        prompt: "If a function passes every test you have written, it is correct for every valid input.",
        answer: false,
        explanation:
          "Tests can show that a bug is present, never that none is. A function may pass ten tests and fail on the empty list, on one element, or on negative numbers. Deliberate test categories reduce the risk, and a proof removes it: that is what DSA Module 1 adds.",
      },
      {
        type: "multiple_choice",
        prompt: md`${"`first`"} and ${"`second`"} are lists of $n$ distinct integers each. Roughly how much work does ${"`[x for x in first if x in second]`"} do in the worst case?`,
        options: [md`About $n$ steps`, md`About $n \log n$ steps`, md`About $n^2$ steps`, md`About $2^n$ steps`],
        answer: 2,
        explanation: md`${"`x in second`"} scans a list, up to $n$ comparisons, and it runs once for each of the $n$ elements of ${"`first`"}. Converting ${"`second`"} to a set first makes each test constant time on average, and the whole expression linear.`,
      },
      {
        type: "multiple_select",
        prompt: "Which of these are sound steps when a test fails? Select all that apply.",
        options: [
          "Reproduce the failure with the smallest input you can find",
          "Change lines at random until the test passes",
          "Trace the small input by hand and find the first step that differs from what you expected",
          "Delete the failing test so that the suite passes",
          "Keep the failing input as a permanent test once the bug is fixed",
        ],
        answers: [0, 2, 4],
        explanation:
          "Reproduce, trace, name the false belief, fix the cause, keep the test. Random changes hide a bug without removing it, and deleting a failing test throws away the one piece of evidence you have.",
        points: 2,
      },
    ],
  },
  project: {
    slug: "gradebook",
    title: "A gradebook built from collections",
    summary: "Functions over a dictionary of student scores, each with a stated cost and a stated effect on its arguments.",
    description: md`A gradebook maps each student's name to the list of their scores, for example ${"`{\"Ada\": [72, 85, 91], \"Alan\": [60, 78]}`"}.

Write the following functions. For each one, the docstring must say **whether the argument is modified** and give the **cost** in terms of the number of students $s$ and the total number of scores $n$.

1. **${"`add_score(book, name, score)`"}**: record a score, creating the student if needed. Modifies ${"`book`"}.
2. **${"`average(book, name)`"}**: the student's mean score. Decide and document what happens for an unknown name and for a student with no scores.
3. **${"`ranking(book)`"}**: the names ordered from highest average to lowest, ties broken alphabetically. Must not modify ${"`book`"}.
4. **${"`above(book, threshold)`"}**: the set of students whose average is strictly greater than the threshold.
5. **${"`histogram(book, width)`"}**: a dictionary from the lower end of each band of the given width to the number of scores in that band. With width 10, a score of 85 is counted under 80.
6. **${"`merged(first, second)`"}**: a **new** gradebook containing the scores from both. Neither argument may be modified, and changing the result afterwards must not change either argument.

Function 6 is the one that tests your understanding of references. A solution that copies the dictionary but shares the score lists is wrong, and your tests must show that yours does not.

Finally, write a first version of ${"`ranking`"} that recomputes each average more than once, count how many additions it performs for a book with 200 students and 10 scores each, and compare with a version that computes each average once.`,
    objectives: [
      "Choose between a list, a dictionary and a set for each part of a task",
      "State the cost of a function in terms of the size of its input",
      "State and test whether a function modifies its arguments",
      "Avoid aliasing bugs when copying nested data",
      "Remove repeated work from a loop and measure the difference",
    ],
    requirements: [
      "All six functions, with docstrings stating effect on arguments and cost",
      "Tests for each function covering the empty gradebook, one student, ties, and an unknown name",
      "A test proving that merged() shares no list with either argument",
      "The operation counts for the two versions of ranking, with one sentence explaining the difference",
      "Runs with one documented command using only the Python standard library",
    ],
    submissionInstructions:
      "Submit a link to a repository or a shared file. It must run with one documented command and report clearly when every assertion passes.",
    rubric: [
      { criterion: "Correctness", description: "Each function meets its contract, including the documented edge cases.", points: 30 },
      { criterion: "References and mutability", description: "Functions modify exactly what they say they modify; merged() is fully independent, and a test shows it.", points: 25 },
      { criterion: "Cost", description: "Stated costs are right, repeated work is removed, and the comparison is measured and explained.", points: 25 },
      { criterion: "Testing", description: "Test cases are chosen by category and include the awkward ones.", points: 20 },
    ],
    dueInDays: 28,
    resources: [
      {
        title: "Python documentation: the copy module",
        description: "Shallow and deep copies, and when each is needed.",
        kind: "link",
        url: "https://docs.python.org/3/library/copy.html",
      },
    ],
  },
  problems: [
    {
      slug: "is-palindrome",
      title: "Palindrome check",
      summary: "Decide whether a string reads the same in both directions, comparing from the two ends inwards.",
      difficulty: "warm_up",
      constraints: ["0 ≤ len(text) ≤ 10^5", "The comparison is exact: case and spaces matter", "Use no extra memory proportional to the length"],
      hints: [
        "Which character must equal the first one? Which must equal the second?",
        "Keep one index at each end and move both inwards after each successful comparison.",
        "Stop when the indices meet or cross. What does your loop do for the empty string and for a single character?",
      ],
    },
    {
      slug: "second-largest",
      title: "Second largest",
      summary: "Find the second largest distinct value in one pass, without sorting.",
      difficulty: "core",
      constraints: ["2 ≤ len(items) ≤ 10^5", "items contains at least two distinct values", "Values may be negative", "The argument must not be modified"],
      hints: [
        "Carry two variables through the loop: the largest value so far and the second largest so far.",
        "When a new value beats the largest, what should happen to the old largest?",
        "What should happen when a value equals the current largest? And what should the two variables be before the loop, given that values can be negative?",
      ],
    },
    {
      slug: "remove-duplicates",
      title: "Remove duplicates",
      summary: "Keep the first occurrence of each value, in order, in linear time.",
      difficulty: "core",
      constraints: ["0 ≤ len(items) ≤ 10^5", "Return a new list; the argument must not be modified", "Required time: proportional to len(items)"],
      hints: [
        "You need two things: the order of first appearance, and a fast answer to 'have I seen this value?'. Which collection is good at each?",
        "Keep a list for the result and a set of the values already added.",
        "Append a value only when it is not in the set, and add it to the set at the same moment.",
      ],
    },
    {
      slug: "fast-power",
      title: "Fast power",
      summary: "Compute an integer power recursively with a logarithmic number of calls.",
      difficulty: "challenge",
      constraints: ["-10 ≤ base ≤ 10", "0 ≤ exponent ≤ 1000", "Test cases keep the result within 2^53 in absolute value", "Recursive, with a number of calls that grows like log(exponent)", "Do not use **, pow or math"],
      hints: [
        "What is the answer when the exponent is 0? That is your base case.",
        "If the exponent is even, the answer is the square of a smaller power. Which one?",
        "Make the recursive call once and store its result in a variable before squaring. Calling it twice loses the whole advantage.",
      ],
    },
  ],
};
