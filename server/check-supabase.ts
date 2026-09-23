// CLI entry point: `npm run db:check`
import "./env.js";
import { checkSupabaseConnection } from "./supabaseHealth.js";

const health = await checkSupabaseConnection();
console.log(JSON.stringify(health, null, 2));
process.exitCode = health.status === "ok" ? 0 : 1;
