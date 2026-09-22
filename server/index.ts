import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT ?? 3001);

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

app.listen(port, () => {
  console.log(`Express API running at http://localhost:${port}`);
});

