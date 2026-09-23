import { Router, raw } from "express";

type OcrResponse = {
  lines: string[];
  scores: number[];
  candidates: string[];
};

export const ocrRouter = Router();

ocrRouter.post(
  "/scan-number",
  raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "8mb" }),
  async (request, response) => {
    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      response.status(400).json({ error: "Image required" });
      return;
    }

    const serviceUrl = (process.env.OCR_SERVICE_URL || "http://127.0.0.1:8001").replace(
      /\/+$/,
      "",
    );

    try {
      const ocrResponse = await fetch(`${serviceUrl}/scan-number`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: new Uint8Array(request.body),
        signal: AbortSignal.timeout(30_000),
      });

      if (!ocrResponse.ok) {
        const details = await ocrResponse.text();
        console.error(`PaddleOCR returned ${ocrResponse.status}: ${details}`);
        response.status(502).json({ error: "OCR failed" });
        return;
      }

      const result = (await ocrResponse.json()) as OcrResponse;
      response.json(result);
    } catch (error) {
      console.error("Could not reach PaddleOCR:", error);
      response.status(503).json({
        error: "OCR service unavailable",
        message: "Start the local Python OCR service on port 8001.",
      });
    }
  },
);
