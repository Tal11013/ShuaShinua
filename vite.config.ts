import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Expose NEXT_PUBLIC_* vars (Supabase URL + anon key) to the client.
  // SUPABASE_SERVICE_ROLE_KEY has no public prefix, so it stays server-only.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
      "/agent-assets": "http://localhost:3001"
    },
  },
});
