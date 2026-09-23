import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // PaddleOCR resolves its worker and WASM assets at runtime. Pre-bundling the
  // package makes Vite point at a hashed worker file in node_modules/.vite
  // that no longer exists after the dependency cache is refreshed.
  optimizeDeps: {
    exclude: ["@paddleocr/paddleocr-js"],
  },
  // Expose NEXT_PUBLIC_* vars (Supabase URL + anon key) to the client.
  // SUPABASE_SERVICE_ROLE_KEY has no public prefix, so it stays server-only.
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  server: {
    port: 5173,
    strictPort: true,
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
