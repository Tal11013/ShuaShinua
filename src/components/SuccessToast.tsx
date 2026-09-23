import { CheckCircle2, X } from "lucide-react";
import { useEffect, useRef } from "react";

const AUTO_DISMISS_MS = 7000;

export function SuccessToast({
  open,
  onClose,
  title,
  message,
  idLabel,
  idValue,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  idLabel: string;
  idValue: number | string | null;
}) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const remainingRef = useRef(AUTO_DISMISS_MS);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const startTimer = (duration: number) => {
    clearTimer();
    startedAtRef.current = Date.now();
    timerRef.current = window.setTimeout(() => onCloseRef.current(), duration);
  };

  // Reset and (re)start the countdown every time the toast opens.
  useEffect(() => {
    if (!open) {
      clearTimer();
      return;
    }

    remainingRef.current = AUTO_DISMISS_MS;
    startTimer(AUTO_DISMISS_MS);
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleMouseEnter = () => {
    const elapsed = Date.now() - startedAtRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    clearTimer();
  };

  const handleMouseLeave = () => {
    startTimer(remainingRef.current);
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="toast"
      role="status"
      dir="rtl"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button className="toast-close" type="button" onClick={onClose} aria-label="סגירה">
        <X aria-hidden="true" size={16} />
      </button>
      <span className="toast-icon">
        <CheckCircle2 aria-hidden="true" size={20} />
      </span>
      <div className="toast-body">
        <strong>{title}</strong>
        <p>{message}</p>
        {idValue !== null ? (
          <span className="toast-id">
            {idLabel}: <strong>{idValue}</strong>
          </span>
        ) : null}
      </div>
      <div className="toast-progress-track" aria-hidden="true">
        <div className="toast-progress-fill" />
      </div>
    </div>
  );
}
