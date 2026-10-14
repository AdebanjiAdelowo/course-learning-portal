import { registry } from "./algorithms";
import { VIZ_LIMITS, type VizAlgorithm, type VizInput } from "./types";

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Parses "3, 8, 12" (commas or spaces) into numbers, within the limits the player can draw. */
export function parseArray(text: string): Parsed<number[]> {
  const parts = text.split(/[\s,]+/).filter(Boolean);
  if (parts.length > VIZ_LIMITS.maxLength) {
    return { ok: false, error: `Use at most ${VIZ_LIMITS.maxLength} values, so each step stays readable.` };
  }
  const values: number[] = [];
  for (const part of parts) {
    if (!/^-?\d+$/.test(part)) return { ok: false, error: `"${part}" is not a whole number.` };
    const value = Number(part);
    if (value < VIZ_LIMITS.minValue || value > VIZ_LIMITS.maxValue) {
      return { ok: false, error: `Values must be between ${VIZ_LIMITS.minValue} and ${VIZ_LIMITS.maxValue}.` };
    }
    values.push(value);
  }
  return { ok: true, value: values };
}

export function parseTarget(text: string): Parsed<number> {
  const trimmed = text.trim();
  if (!/^-?\d+$/.test(trimmed)) return { ok: false, error: "The target must be a whole number." };
  const value = Number(trimmed);
  if (value < VIZ_LIMITS.minValue || value > VIZ_LIMITS.maxValue) {
    return { ok: false, error: `The target must be between ${VIZ_LIMITS.minValue} and ${VIZ_LIMITS.maxValue}.` };
  }
  return { ok: true, value };
}

export function isSorted(values: readonly number[]): boolean {
  return values.every((value, index) => index === 0 || values[index - 1]! <= value);
}

/** Validates an input for a given algorithm, including its preconditions. */
export function validateInput(algorithm: VizAlgorithm, arrayText: string, targetText: string, options: { operation?: string; index?: string; value?: string } = {}): Parsed<VizInput> {
  const array = parseArray(arrayText);
  if (!array.ok) return array;
  if (algorithm.requiresSorted && !isSorted(array.value)) {
    return { ok: false, error: `${algorithm.title} requires the list to be sorted in non-decreasing order.` };
  }
  if (algorithm.operations) {
    const operation = options.operation ?? "append";
    if (!algorithm.operations.includes(operation as import("./dynamic-array").ArrayOperation)) return { ok: false, error: "Choose a supported array operation." };
    if (!/^-?\d+$/.test(options.index ?? "0") || !/^-?\d+$/.test(options.value ?? "7")) return { ok: false, error: "Enter whole numbers for index and value." };
    const index = Number(options.index ?? "0"), value = Number(options.value ?? "7");
    if (!Number.isInteger(index) || !Number.isSafeInteger(value) || value < VIZ_LIMITS.minValue || value > VIZ_LIMITS.maxValue) return { ok: false, error: "Use a whole index and a value within the displayed input bounds." };
    if ((operation === "access" || operation === "delete") && (index < 0 || index >= array.value.length)) return { ok: false, error: "Index must refer to an existing element." };
    if (operation === "insert" && (index < 0 || index > array.value.length)) return { ok: false, error: "Insertion index must be between zero and size." };
    return { ok: true, value: { array: array.value, operation: operation as import("./dynamic-array").ArrayOperation, index, value } };
  }
  if (!algorithm.needsTarget) return { ok: true, value: { array: array.value } };
  const target = parseTarget(targetText);
  if (!target.ok) return target;
  if (algorithm.id === "recursive-factorial" && (target.value < 0 || target.value > 8)) {
    return { ok: false, error: "Factorial traces need an integer from 0 to 8." };
  }
  return { ok: true, value: { array: array.value, target: target.value } };
}

export interface VizSpec {
  algorithm: VizAlgorithm;
  input: VizInput;
}

/**
 * Parses the body of a ```viz fenced block:
 *
 *     algorithm: binary-search
 *     input: 3, 8, 12
 *     target: 8
 */
export function parseVizBlock(source: string): Parsed<VizSpec> {
  const fields = new Map<string, string>();
  for (const line of source.split("\n")) {
    if (!line.trim()) continue;
    const separator = line.indexOf(":");
    if (separator === -1) return { ok: false, error: `Expected "name: value", found "${line.trim()}".` };
    fields.set(line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim());
  }
  const id = fields.get("algorithm");
  if (!id) return { ok: false, error: 'A visualization needs an "algorithm:" line.' };
  const algorithm = registry[id];
  if (!algorithm) {
    return { ok: false, error: `Unknown algorithm "${id}". Available: ${Object.keys(registry).join(", ")}.` };
  }
  const input = validateInput(algorithm, fields.get("input") ?? "", fields.get("target") ?? "", { operation: fields.get("operation"), index: fields.get("index"), value: fields.get("value") });
  if (!input.ok) return input;
  return { ok: true, value: { algorithm, input: input.value } };
}
