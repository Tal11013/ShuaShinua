# Local PaddleOCR trial

The standalone script reads a photo on your computer and prints every detected
text line, its extracted digits, and a confidence score. The same PaddleOCR
pipeline is also exposed locally to the app through `ocr/app.py`.

From the repository root in Windows PowerShell, with Python 3.11 installed:

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install paddlepaddle==3.2.0 -i https://www.paddlepaddle.org.cn/packages/stable/cpu/
python -m pip install -r ocr/requirements.txt
python ocr/local_scan.py ocr/samples/box.jpg
```

Create `ocr/samples/` and put a test photo there first, or pass any local JPG or
PNG path instead. The first run downloads the OCR models. If the printed ID is
among other numbers in the image, check the **Read** lines individually before
deciding how to select a package ID. Test photos and `.venv` are ignored by Git.

## Test through the app

Open three PowerShell terminals in the repository root. In the first terminal:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn ocr.app:app --host 127.0.0.1 --port 8001
```

Wait until it prints `Application startup complete`. The first startup can take
longer while PaddleOCR downloads its models.

In the second terminal:

```powershell
npm run dev
```

In the third terminal, expose Vite over HTTPS so a phone browser can use its
camera:

```powershell
npx wrangler tunnel quick-start http://localhost:5173
```

Open the generated `https://...trycloudflare.com` URL on the phone. The request
path is phone camera -> Vite `/api` proxy -> Express on port 3001 -> PaddleOCR on
port 8001.
