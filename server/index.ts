import "./env.js";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { checkSupabaseConnection } from "./supabaseHealth.js";
import { errorHandler } from "./http.js";
import { usersRouter } from "./routes/users.js";
import { groupsRouter } from "./routes/groups.js";
import { relocationRouter } from "./routes/relocation.js";
import {
  categoriesRouter,
  groupCodesRouter,
  itemTypesRouter,
  locationsRouter,
  mappingReportsRouter,
  roomsRouter,
  subCategoriesRouter,
} from "./routes/operations.js";
const app = express();
const port = Number(process.env.PORT || 3001);

// The deployed client lives on another origin (Vercel). CLIENT_URL may list
// several origins separated by commas, e.g. production plus a preview URL.
// Locally the Vite dev server proxies /api, so CORS isn't needed there.
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Serve static files from the agent directory (for generated charts)
app.use("/agent-assets", express.static(path.join(__dirname, "../agent")));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "ShuaShinua API",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const response = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      throw new Error(`Agent API returned ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error communicating with Agent API:", error);
    res.status(500).json({ error: "Failed to communicate with Agent API" });
  }
});

app.get("/api/health/supabase", async (_request, response) => {
  const health = await checkSupabaseConnection();
  response.status(health.status === "ok" ? 200 : 503).json(health);
});

app.use("/api/users", usersRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/group-codes", groupCodesRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/mapping-reports", mappingReportsRouter);
app.use("/api/item-types", itemTypesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/sub-categories", subCategoriesRouter);
app.use("/api", relocationRouter);

app.use("/api", (_request, response) => {
  response.status(404).json({ error: "Not found" });
});

app.use(errorHandler);
app.listen(port, () => {
  console.log(`Express API running at http://localhost:${port}`);
});
