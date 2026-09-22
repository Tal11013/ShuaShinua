// Generate types/supabase.ts from the database schema.
//   node scripts/gen-types.mjs          -> remote project (SUPABASE_PROJECT_ID)
//   node scripts/gen-types.mjs --local  -> local stack (`npm run supabase:start`)
// Only overwrites the file when generation succeeds.
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";

try {
  process.loadEnvFile(".env.local");
} catch {}

const local = process.argv.includes("--local");
const projectId = process.env.SUPABASE_PROJECT_ID;

if (!local && (!projectId || projectId.startsWith("your-"))) {
  console.error("Set SUPABASE_PROJECT_ID in .env.local (or use db:gen-types:local).");
  process.exit(1);
}

const target = local ? ["--local"] : ["--project-id", projectId];
const result = spawnSync(
  "supabase",
  ["gen", "types", "typescript", ...target, "--schema", "public"],
  { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] },
);

if (result.status !== 0 || !result.stdout.trim()) {
  console.error("Type generation failed; types/supabase.ts left unchanged.");
  process.exit(result.status || 1);
}

writeFileSync("types/supabase.ts", result.stdout);
console.log("Wrote types/supabase.ts");
