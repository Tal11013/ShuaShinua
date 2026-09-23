import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SuccessToast } from "../components/SuccessToast";

export type ToastPayload = {
  title: string;
  message: string;
  idLabel: string;
  idValue: number | string | null;
};

type ToastContextValue = {
  showSuccessToast: (payload: ToastPayload) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Mounted once at the app root (outside the router's outlet) so a toast
// keeps counting down across route navigations instead of being unmounted
// along with the screen that triggered it.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastPayload | null>(null);

  const showSuccessToast = useCallback((payload: ToastPayload) => {
    setToast(payload);
  }, []);

  const closeToast = useCallback(() => {
    setToast(null);
  }, []);

  const value = useMemo(() => ({ showSuccessToast }), [showSuccessToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <SuccessToast
        open={toast !== null}
        onClose={closeToast}
        title={toast?.title ?? ""}
        message={toast?.message ?? ""}
        idLabel={toast?.idLabel ?? ""}
        idValue={toast?.idValue ?? null}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
