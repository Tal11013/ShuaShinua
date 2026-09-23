# Local PaddleOCR trial

This script reads a photo on your computer and prints every detected text line,
its extracted digits, and a confidence score. It does not change the React or
Express scanner yet.

From the repository root in Windows PowerShell, with Python 3.11 installed:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
python -m pip install "paddleocr>=3,<4"
python ocr/local_scan.py ocr/samples/box.jpg
```

Create `ocr/samples/` and put a test photo there first, or pass any local JPG or
PNG path instead. The first run downloads the OCR models. If the printed ID is
among other numbers in the image, check the **Read** lines individually before
deciding how to select a package ID. Test photos and `.venv` are ignored by Git.
