import { Link } from "@tanstack/react-router";
import { ChevronRight, LogOut } from "lucide-react";
import type {
  ButtonHTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from "react";
import { BottomNav } from "./BottomNav";
import { useRelocation } from "../state/relocation";

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
  const { currentUser, logout } = useRelocation();

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
            {currentUser ? <p>ברוך הבא, {currentUser.name}</p> : null}
          </div>
          {currentUser ? (
            <button
              className="logout-button"
              type="button"
              onClick={logout}
              aria-label="יציאה"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>
      <main className="shell-content">{children}</main>
      {footer ? <footer className="shell-footer">{footer}</footer> : null}
      <BottomNav />
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
