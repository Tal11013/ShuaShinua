import { Router, type NextFunction, type Response } from "express";
import { HttpError } from "../http.js";
import { canAccessManagementReport } from "../../src/domain/users.js";
import { authenticate, getAccess, type AuthedRequest } from "./relocation.js";

// Proxies the chat agent (FastAPI, agent/server.py). The browser only talks to
// this server: users must be logged-in managers (the agent can query every
// group's data, unlike the scoped flow endpoints), and the agent is reached
// server-side at AGENT_URL with the shared AGENT_TOKEN.
//
//   POST /api/chat             -> AGENT_URL/chat
//   GET  /api/colab_status     -> AGENT_URL/api/colab_status
//   GET  /agent-assets/images/* -> AGENT_URL/agent-assets/images/* (charts)

export const agentRouter = Router();

const agentUrl = () => (process.env.AGENT_URL || "http://localhost:8000").replace(/\/+$/, "");

// LLM tool loops can take a while, but not forever.
const CHAT_TIMEOUT_MS = 120_000;

function agentHeaders(): Record<string, string> {
  const token = process.env.AGENT_TOKEN;
  return token ? { "x-agent-token": token } : {};
}

function requireManager(request: AuthedRequest, _response: Response, next: NextFunction) {
  if (!canAccessManagementReport(getAccess(request).user)) {
    throw new HttpError(403, "הסוכן זמין למנהלים בלבד.");
  }
  next();
}

async function forward(response: Response, path: string, init: RequestInit = {}) {
  let agentResponse: globalThis.Response;
  try {
    agentResponse = await fetch(`${agentUrl()}${path}`, {
      ...init,
      headers: { ...agentHeaders(), ...init.headers },
    });
  } catch (error) {
    console.error(`Agent unreachable at ${agentUrl()}:`, error);
    response.status(502).json({ error: "שירות הסוכן אינו זמין כרגע." });
    return;
  }

  const body = await agentResponse.text();
  if (!agentResponse.ok) {
    console.error(`Agent ${path} returned ${agentResponse.status}: ${body.slice(0, 500)}`);
    response.status(502).json({ error: "הסוכן החזיר שגיאה." });
    return;
  }
  response.type("application/json").send(body);
}

agentRouter.post("/api/chat", authenticate, requireManager, async (request: AuthedRequest, response) => {
  await forward(response, "/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request.body ?? {}),
    signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
  });
});

agentRouter.get("/api/colab_status", authenticate, requireManager, async (_request, response) => {
  await forward(response, "/api/colab_status", { signal: AbortSignal.timeout(10_000) });
});

// <img> tags can't send the login header, so charts aren't behind authenticate.
agentRouter.get("/agent-assets/images/:file", async (request, response) => {
  const file = request.params.file;
  if (!/^[^/\\]+\.png$/.test(file)) {
    response.status(404).end();
    return;
  }

  try {
    const image = await fetch(
      `${agentUrl()}/agent-assets/images/${encodeURIComponent(file)}`,
      { headers: agentHeaders(), signal: AbortSignal.timeout(10_000) },
    );
    if (!image.ok) {
      response.status(image.status === 404 ? 404 : 502).end();
      return;
    }
    response.type("image/png").send(Buffer.from(await image.arrayBuffer()));
  } catch {
    response.status(502).end();
  }
});
