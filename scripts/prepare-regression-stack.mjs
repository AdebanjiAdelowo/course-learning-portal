import { cpSync, mkdirSync, readFileSync, writeFileSync, lstatSync, unlinkSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const target = resolve(root, "tests/regression-stack/supabase");
mkdirSync(target, { recursive: true });
const config = readFileSync(resolve(root, "supabase/config.toml"), "utf8")
  .replace('project_id = "course-learning-portal"', 'project_id = "course-learning-portal-regression"')
  .replace(/\b543(2\d)\b/g, (_, suffix) => `553${suffix}`)
  .replace(/(\[db.seed\][\s\S]*?enabled = )true/, "$1false");
writeFileSync(resolve(target, "config.toml"), config);
for (const name of ["migrations", "templates"]) {
  const destination = resolve(target, name);
  // Replace only generated links from the initial preparation, never source files or Docker data.
  if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) unlinkSync(destination);
  cpSync(resolve(root, "supabase", name), destination, { recursive: true });
}
console.log("Prepared isolated course-learning-portal-regression stack on ports 55320–55329. No database operation performed.");
