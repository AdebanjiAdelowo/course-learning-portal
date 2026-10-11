/**
 * JSON parsing that keeps integers exact.
 *
 * JavaScript numbers are doubles: an integer above 2^53 does not survive JSON.parse. Test cases
 * for Python problems contain such integers (10^18 is an ordinary Python int), so parsing a
 * tests file the usual way would silently change the tests.
 *
 * `parseExact` keeps any integer that a double cannot hold as its original digits, wrapped so
 * that JSON.stringify writes those digits back unchanged. The value reaches PostgreSQL, whose
 * JSON numbers are arbitrary precision, exactly as it was written in the file.
 */

interface RawJson {
  rawJSON: string;
}

const json = JSON as unknown as {
  parse(text: string, reviver: (key: string, value: unknown, context: { source?: string }) => unknown): unknown;
  rawJSON(text: string): RawJson;
  isRawJSON(value: unknown): value is RawJson;
};

export function parseExact(text: string): unknown {
  return json.parse(text, (_key, value, context) => {
    if (typeof value === "number" && context?.source !== undefined && /^-?\d+$/.test(context.source) && !Number.isSafeInteger(value)) {
      return json.rawJSON(context.source);
    }
    return value;
  });
}

/** True when a parsed value contains an integer too large for a JavaScript number. */
export function hasUnsafeInteger(value: unknown): boolean {
  if (json.isRawJSON(value)) return true;
  if (Array.isArray(value)) return value.some(hasUnsafeInteger);
  if (value && typeof value === "object") return Object.values(value).some(hasUnsafeInteger);
  return false;
}
