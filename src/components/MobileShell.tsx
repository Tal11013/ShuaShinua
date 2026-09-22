import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from "react";

export function MobileShell({
  title,
  subtitle,
  backTo,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  backTo?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mobile-shell" dir="rtl">
      <header className="shell-header">
        <div className="shell-title-row">
          {backTo ? (
            <Link className="back-link" to={backTo} aria-label="חזרה">
              <ChevronRight aria-hidden="true" size={22} />
            </Link>
          ) : null}
          <div>
            <h1>{title}</h1>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
      </header>
      <main className="shell-content">{children}</main>
      {footer ? <footer className="shell-footer">{footer}</footer> : null}
    </div>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`primary-button ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`ghost-button ${className}`} type="button" {...props}>
      {children}
    </button>
  );
}

export function RowButton({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      className={selected ? "row-button selected" : "row-button"}
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

