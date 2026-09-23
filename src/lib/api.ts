// Base URL of the Express API. In production (Vercel) set VITE_API_URL to the
// Render service, e.g. https://shuashinua-api.onrender.com. When unset, paths
// stay relative ("/api/...") and the Vite dev server proxies them to
// localhost:3001 (see vite.config.ts), so local development needs no config.
const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}
