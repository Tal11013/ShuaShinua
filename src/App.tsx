import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  service: string;
};

const models = [
  "User",
  "Group",
  "UserGroup",
  "GroupCode",
  "Location",
  "Room",
  "ItemType",
  "Category",
  "SubCategory",
  "MappingReport",
];

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
        <p className="eyebrow">React + TypeScript + Express</p>
        <h1>ShuaShinua</h1>
        <p className="summary">
          A basic full-stack project is running locally. The React app is served
          by Vite, and API requests go to Express.
        </p>
      </section>

      <section className="panel">
        <div>
          <h2>API Status</h2>
          <p className={health?.status === "ok" ? "status ok" : "status"}>
            {health ? `${health.service}: ${health.status}` : "Checking..."}
          </p>
        </div>
      </section>

      <section className="models" aria-label="Project models">
        {models.map((model) => (
          <article className="model" key={model}>
            <h2>{model}</h2>
            <p>TypeScript model available in the shared types folder.</p>
          </article>
        ))}
      </section>
    </main>
  );
}

