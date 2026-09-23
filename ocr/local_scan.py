"""Try PaddleOCR on a local image before connecting it to the web app."""

import argparse
import re
from pathlib import Path

from paddleocr import PaddleOCR


def main() -> None:
    parser = argparse.ArgumentParser(description="Read package numbers from a photo")
    parser.add_argument("image", type=Path, help="Path to a JPG or PNG photo")
    args = parser.parse_args()

    if not args.image.is_file():
        parser.error(f"Image not found: {args.image}")

    ocr = PaddleOCR(
        lang="en",
        use_doc_orientation_classify=False,
        use_doc_unwarping=False,
        use_textline_orientation=False,
    )

    found = False
    for result in ocr.predict(str(args.image)):
        data = result.json["res"]
        for text, score in zip(data["rec_texts"], data["rec_scores"]):
            found = True
            digits = re.sub(r"\D", "", text)
            print(f"Read: {text!r} | digits: {digits!r} | confidence: {float(score):.2f}")

    if not found:
        print("No text detected. Try a closer, well-lit photo of the printed number.")


if __name__ == "__main__":
    main()
