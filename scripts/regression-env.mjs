import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const [script, ...args] = process.argv.slice(2);
if (!["seed", "test:integration", "test:e2e", "build", "start"].includes(script)) throw new Error("Choose seed, test:integration, test:e2e, build or start.");
let status;
try {
  status = execFileSync(resolve(root, "node_modules/.bin/supabase"), ["status", "--workdir", "tests/regression-stack", "-o", "env"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
} catch {
  throw new Error("Could not read the isolated stack status. Start its local services first.");
}
const entries = Object.fromEntries(status.split("\n").filter(line => /^[A-Z_]+=/.test(line)).map(line => {
  const i = line.indexOf("=");
  return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, "")];
}));
if (entries.API_URL !== "http://127.0.0.1:55321" || !entries.ANON_KEY || !entries.SERVICE_ROLE_KEY) throw new Error("Expected isolated local stack at port 55321. Refusing to run.");
const passwordPath = resolve(root, "tests/regression-stack/.password");
if (!existsSync(passwordPath)) writeFileSync(passwordPath, `regression-only-${randomBytes(18).toString("hex")}`, { mode: 0o600, flag: "wx" });
const env = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: entries.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: entries.ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: entries.SERVICE_ROLE_KEY, SEED_DEMO_PASSWORD: readFileSync(passwordPath, "utf8"), NEXT_PUBLIC_COURSE_SLUG: "data-structures-and-algorithms", NEXT_PUBLIC_SITE_URL: "http://localhost:3000" };
const result = spawnSync("npm", ["run", script, ...args], { cwd: root, env, stdio: "inherit" });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
