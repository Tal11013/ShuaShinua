import { useEffect, useState } from "react";
import Chat from "./components/Chat";

type HealthResponse = {
  status: string;
  service: string;
};

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json() as Promise<HealthResponse>)
      .then(setHealth)
      .catch(() => setHealth({ status: "error", service: "API unavailable" }));
  }, []);

  return (
    <main className="app">
      <section className="hero">
        <p className="eyebrow">React + TypeScript + Express + Python Agent</p>
        <h1>ShuaShinua</h1>
        <p className="summary">
          A full-stack logistics management system powered by an LLM agent.
        </p>
      </section>

      <section className="panel" style={{ marginBottom: "2rem" }}>
        <div>
          <h2>API Status</h2>
          <p className={health?.status === "ok" ? "status ok" : "status"}>
            {health ? `${health.service}: ${health.status}` : "Checking..."}
          </p>
        </div>
      </section>

      <section className="chat-section">
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Logistics Agent</h2>
        <Chat />
      </section>
    </main>
  );
}

