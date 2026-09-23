"""Local PaddleOCR HTTP service used by the Express API during development."""

from io import BytesIO
import re

import numpy as np
from fastapi import Body, FastAPI, HTTPException
from paddleocr import PaddleOCR
from PIL import Image, UnidentifiedImageError

app = FastAPI(title="ShuaShinua OCR")

# Loading the models is expensive, so keep one pipeline for the process lifetime.
ocr = PaddleOCR(
    lang="en",
    use_doc_orientation_classify=False,
    use_doc_unwarping=False,
    use_textline_orientation=False,
)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/scan-number")
def scan_number(
    image_bytes: bytes = Body(..., media_type="application/octet-stream"),
) -> dict[str, object]:
    try:
        image = np.asarray(Image.open(BytesIO(image_bytes)).convert("RGB"))
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise HTTPException(status_code=400, detail="Invalid image") from error

    lines: list[str] = []
    scores: list[float] = []

    for result in ocr.predict(image):
        data = result.json["res"]
        lines.extend(str(text) for text in data["rec_texts"])
        scores.extend(float(score) for score in data["rec_scores"])

    candidates = [
        digits
        for line in lines
        if (digits := re.sub(r"\D", "", line))
    ]

    return {"lines": lines, "scores": scores, "candidates": candidates}
