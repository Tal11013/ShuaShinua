import { X } from "lucide-react";
import type { ReactNode } from "react";
import { GhostButton } from "./MobileShell";

export function Sheet({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="sheet-backdrop" role="presentation">
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <header className="sheet-header">
          <h2>{title}</h2>
          <GhostButton className="icon-button" onClick={onClose} aria-label="סגירה">
            <X aria-hidden="true" size={18} />
          </GhostButton>
        </header>
        <div>{children}</div>
      </section>
    </div>
  );
}

