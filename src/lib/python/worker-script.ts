import { PYTHON_HARNESS } from "./harness";

export const PYODIDE_BASE_PATH = "/pyodide/";
export const PYTHON_WORKER_PATH = "/pyodide-worker";

/**
 * Source of the Web Worker that runs Python. It is served by `src/app/pyodide-worker/route.ts`
 * with its own, very narrow Content-Security-Policy, and loaded as a module worker.
 *
 * The worker does one thing: load Pyodide from this site, then answer run requests by calling
 * the Python harness. It has no access to the page, to cookies or to the DOM, and its policy
 * lets it fetch nothing but the runtime files, so code running in it cannot reach the
 * application's pages, its API or any other site.
 *
 * Python runs synchronously, so while a program is running the worker cannot receive
 * messages. There is no "stop" message: the page stops a run by terminating the worker.
 */
export function buildWorkerScript(): string {
  return `import { loadPyodide } from ${JSON.stringify(`${PYODIDE_BASE_PATH}pyodide.mjs`)};

const HARNESS = ${JSON.stringify(PYTHON_HARNESS)};
let runtime = null;

function start() {
  if (!runtime) {
    runtime = (async () => {
      const pyodide = await loadPyodide({ indexURL: ${JSON.stringify(PYODIDE_BASE_PATH)} });
      pyodide.runPython(HARNESS);
      return pyodide;
    })();
  }
  return runtime;
}

self.onmessage = async (event) => {
  const message = event.data;
  if (!message || message.type !== "run") return;
  const id = message.id;
  let pyodide;
  try {
    self.postMessage({ type: "loading", id });
    pyodide = await start();
  } catch (error) {
    runtime = null;
    self.postMessage({ type: "init_failed", id, message: String(error && error.message ? error.message : error) });
    return;
  }
  try {
    self.postMessage({ type: "started", id });
    const handle = pyodide.globals.get("handle_request");
    let output;
    try {
      output = handle(JSON.stringify(message.request));
    } finally {
      if (handle && typeof handle.destroy === "function") handle.destroy();
    }
    self.postMessage({ type: "result", id, result: JSON.parse(output) });
  } catch (error) {
    self.postMessage({ type: "crashed", id, message: String(error && error.message ? error.message : error) });
  }
};
`;
}

/**
 * Policy for the worker itself. Nothing is allowed by default; scripts and network requests
 * are limited to the runtime folder on the given origins, plus WebAssembly compilation, which
 * the Python interpreter needs. There is no 'unsafe-eval' and no access to any other path.
 */
export function buildWorkerContentSecurityPolicy(origins: readonly string[]): string {
  const sources = [...new Set(origins)].map((origin) => `${origin}${PYODIDE_BASE_PATH}`).join(" ");
  return [`default-src 'none'`, `script-src ${sources} 'wasm-unsafe-eval'`, `connect-src ${sources}`].join("; ");
}
