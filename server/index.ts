import "./env.js";
import express from "express";
import { checkSupabaseConnection } from "./supabaseHealth.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "ShuaShinua API",
  });
});

app.get("/api/health/supabase", async (_request, response) => {
  const health = await checkSupabaseConnection();
  response.status(health.status === "ok" ? 200 : 503).json(health);
});

app.listen(port, () => {
  console.log(`Express API running at http://localhost:${port}`);
});
