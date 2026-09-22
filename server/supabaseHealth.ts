import { getSupabaseAdmin } from "./supabase.js";

type CheckResult = { ok: boolean; message: string };

export type SupabaseHealth = {
  status: "ok" | "error" | "not_configured";
  url: string | null;
  checks: {
    config?: CheckResult;
    anonKey?: CheckResult;
    serviceRoleKey?: CheckResult;
  };
};

const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith("your-") || value.includes("your-project-ref");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Verifies the URL is reachable and both keys are accepted. Needs no tables,
// so it works on a fresh project.
export async function checkSupabaseConnection(): Promise<SupabaseHealth> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
  const missing = REQUIRED_VARS.filter((name) => isPlaceholder(process.env[name]));
  if (missing.length > 0) {
    return {
      status: "not_configured",
      url,
      checks: {
        config: { ok: false, message: `Set real values for: ${missing.join(", ")}` },
      },
    };
  }

  const checks: SupabaseHealth["checks"] = {};

  // Anon key: hit the Auth health endpoint, which requires a valid API key.
  try {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const response = await fetch(new URL("/auth/v1/health", url!), {
      headers: { apikey: anonKey },
      signal: AbortSignal.timeout(5000),
    });
    checks.anonKey = response.ok
      ? { ok: true, message: "Auth API reachable with anon key" }
      : { ok: false, message: `Auth API responded ${response.status} ${response.statusText}` };
  } catch (error) {
    checks.anonKey = { ok: false, message: errorMessage(error) };
  }

  // Service role key: an admin-only call that fails with an invalid key.
  try {
    const { error } = await getSupabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1 });
    checks.serviceRoleKey = error
      ? { ok: false, message: error.message }
      : { ok: true, message: "Admin API accepted service role key" };
  } catch (error) {
    checks.serviceRoleKey = { ok: false, message: errorMessage(error) };
  }

  const ok = Object.values(checks).every((check) => check.ok);
  return { status: ok ? "ok" : "error", url, checks };
}
