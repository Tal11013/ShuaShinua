// Load env files for the Express server (Vite handles them for the client).
// Earlier files win: process.loadEnvFile never overrides variables already set.
for (const file of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
