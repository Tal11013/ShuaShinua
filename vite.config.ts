import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // PaddleOCR imports OpenCV from a CommonJS-only package. Let Vite pre-bundle
  // both packages so browsers receive a valid ESM default export. OCR runs
  // without the SDK worker, so the old missing worker-entry issue is avoided.
  optimizeDeps: {
    include: ["@paddleocr/paddleocr-js", "@techstark/opencv-js"],
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
