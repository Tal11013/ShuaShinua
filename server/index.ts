import express from "express";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "ShuaShinua API",
  });
});

app.listen(port, () => {
  console.log(`Express API running at http://localhost:${port}`);
});

