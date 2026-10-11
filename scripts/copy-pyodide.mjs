/**
 * Copies the Pyodide runtime from node_modules into public/pyodide, where the browser loads it.
 *
 * The runtime is served from this site's own origin, at the exact version pinned in
 * package.json, so running Python needs no third-party host and the Content-Security-Policy
 * needs no external source. The copied files are build output and are not committed.
 *
 * Runs after `npm install` and before `npm run dev` / `npm run build`.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "node_modules", "pyodide");
const target = path.join(root, "public", "pyodide");

// Everything the runtime fetches for standard-library-only use. No packages are loaded.
const files = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];

if (!existsSync(source)) {
  console.error("copy-pyodide: node_modules/pyodide is missing. Run `npm install` first.");
  process.exit(1);
}

const { version } = JSON.parse(readFileSync(path.join(source, "package.json"), "utf8"));
mkdirSync(target, { recursive: true });

let copied = 0;
for (const file of files) {
  const from = path.join(source, file);
  const to = path.join(target, file);
  if (!existsSync(from)) {
    console.error(`copy-pyodide: ${file} is not in pyodide ${version}. Update the file list in scripts/copy-pyodide.mjs.`);
    process.exit(1);
  }
  if (!existsSync(to) || statSync(to).size !== statSync(from).size || statSync(to).mtimeMs < statSync(from).mtimeMs) {
    copyFileSync(from, to);
    copied += 1;
  }
}
writeFileSync(path.join(target, "VERSION"), `${version}\n`);
console.log(`copy-pyodide: pyodide ${version} in public/pyodide (${copied} file${copied === 1 ? "" : "s"} updated).`);
