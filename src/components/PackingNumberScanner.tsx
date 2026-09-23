import { Camera, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GhostButton, PrimaryButton } from "./MobileShell";
import { Sheet } from "./Sheet";

type ScannerStatus = "requesting" | "ready" | "recognizing";

type PaddleOcrClient = Awaited<
  ReturnType<(typeof import("@paddleocr/paddleocr-js"))["PaddleOCR"]["create"]>
>;

let paddleOcrPromise: Promise<PaddleOcrClient> | null = null;

function getPaddleOcr() {
  if (!paddleOcrPromise) {
    paddleOcrPromise = import("@paddleocr/paddleocr-js")
      .then(({ PaddleOCR }) =>
        PaddleOCR.create({
          textDetectionModelName: "PP-OCRv5_mobile_det",
          textRecognitionModelName: "PP-OCRv5_mobile_rec",
          // The SDK's published worker bundle is not reliably resolved by
          // Vite's development server. Running on the main thread avoids the
          // missing worker-entry asset while keeping the same OCR pipeline.
          worker: false,
          ortOptions: {
            backend: "wasm",
            wasmPaths:
              "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/",
            numThreads: 1,
            simd: true,
          },
        }),
      )
      .catch((error) => {
        paddleOcrPromise = null;
        throw error;
      });
  }

  return paddleOcrPromise;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function findPackingId(text: string, availablePackingIds: number[]) {
  const detectedNumbers: string[] = text.match(/\d+/g) ?? [];
  const candidates = [...detectedNumbers, detectedNumbers.join("")];

  return availablePackingIds.find((packingId) =>
    candidates.includes(String(packingId)),
  );
}

export function PackingNumberScanner({
  availablePackingIds,
  onDetected,
}: {
  availablePackingIds: number[];
  onDetected: (packingId: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ScannerStatus>("requesting");
  const [error, setError] = useState("");

  const closeScanner = () => {
    stopStream(streamRef.current);
    streamRef.current = null;
    setOpen(false);
    setError("");
  };

  useEffect(
    () => () => {
      stopStream(streamRef.current);
    },
    [],
  );

  const openCamera = async () => {
    setOpen(true);
    setStatus("requesting");
    setError("");

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("לא ניתן לפתוח מצלמה. יש לפתוח את המערכת בחיבור HTTPS ולנסות שוב.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      streamRef.current = stream;
      setStatus("ready");

      // Begin the model download while the user positions the number in frame.
      void getPaddleOcr().catch((error) => {
        console.error("PaddleOCR.js initialization failed:", error);
      });

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (caught) {
      const denied =
        caught instanceof DOMException &&
        (caught.name === "NotAllowedError" || caught.name === "PermissionDeniedError");

      setError(
        denied
          ? "לא ניתנה הרשאה למצלמה. יש לאפשר גישה למצלמה ולנסות שוב."
          : "לא הצלחנו לפתוח את המצלמה. יש לוודא שהיא אינה בשימוש באפליקציה אחרת.",
      );
    }
  };

  const recognizePackingNumber = async () => {
    const video = videoRef.current;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setError("המצלמה עדיין נטענת. יש לנסות שוב בעוד רגע.");
      return;
    }

    setStatus("recognizing");
    setError("");

    const canvas = document.createElement("canvas");
    const sourceWidth = video.videoWidth * 0.8;
    const sourceHeight = video.videoHeight * 0.4;
    const sourceX = (video.videoWidth - sourceWidth) / 2;
    const sourceY = (video.videoHeight - sourceHeight) / 2;
    const outputWidth = Math.min(1600, Math.round(sourceWidth));

    canvas.width = outputWidth;
    canvas.height = Math.round((sourceHeight / sourceWidth) * outputWidth);
    canvas
      .getContext("2d")
      ?.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

    try {
      const image = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Could not capture camera image"));
        }, "image/jpeg", 0.92);
      });

      const ocr = await getPaddleOcr();
      const [result] = await ocr.predict(image, { textRecScoreThresh: 0.35 });
      const detectedText = (result?.items ?? [])
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const packingId = findPackingId(detectedText, availablePackingIds);

      if (packingId === undefined) {
        setError(
          detectedText
            ? `זוהה הטקסט “${detectedText}”, אך לא נמצאה אריזה סגורה זמינה במספר הזה.`
            : "לא הצלחנו לזהות מספר. יש למקם את המספר בתוך המסגרת ולצלם שוב.",
        );
        setStatus("ready");
        return;
      }

      onDetected(packingId);
      closeScanner();
    } catch (caught) {
      console.error("PaddleOCR.js recognition failed:", caught);
      const reason =
        caught instanceof Error ? caught.message : "שגיאה לא ידועה";
      setError(`זיהוי המספר נכשל: ${reason}`);
      setStatus("ready");
    }
  };

  return (
    <>
      <GhostButton
        className="packing-camera-button"
        onClick={openCamera}
        disabled={availablePackingIds.length === 0}
        aria-label="סריקת מספר אריזה באמצעות המצלמה"
        title="סריקת מספר אריזה"
      >
        <Camera aria-hidden="true" size={22} />
      </GhostButton>

      <Sheet title="סריקת מספר אריזה" open={open} onClose={closeScanner}>
        <div className="packing-scanner">
          <p>יש למקם את מספר האריזה בתוך המסגרת ולצלם.</p>

          <div className="packing-camera-preview">
            <video ref={videoRef} playsInline muted />
            <div className="packing-camera-frame" aria-hidden="true">
              <ScanLine size={28} />
            </div>
            {status === "requesting" && !error ? (
              <span className="packing-camera-loading">פותח מצלמה...</span>
            ) : null}
          </div>

          {status === "recognizing" ? (
            <p className="packing-scanner-status">
              מזהה מספר אריזה...
            </p>
          ) : null}
          {error ? <p className="state-message error">{error}</p> : null}

          <PrimaryButton
            disabled={status !== "ready"}
            onClick={recognizePackingNumber}
          >
            {status === "recognizing" ? "מזהה..." : "צילום וזיהוי מספר"}
          </PrimaryButton>
        </div>
      </Sheet>
    </>
  );
}
