import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, Truck } from "lucide-react";
import { UserRole } from "../../types";
import { useRelocation } from "../state/relocation";

const operativeRoutes = new Set([
  "/",
  "/processes",
  "/packing",
  "/transport",
  "/receiving",
  "/distribution",
]);

export function BottomNav() {
  const { currentUser } = useRelocation();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const canSeeReport =
    currentUser?.role === UserRole.UNIT_MANAGER ||
    currentUser?.role === UserRole.GLOBAL_MANAGER;

  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      <Link
        className={operativeRoutes.has(pathname) ? "nav-item active" : "nav-item"}
        to="/"
      >
        <Truck aria-hidden="true" size={20} />
        <span>שינוע ציוד</span>
      </Link>
      {canSeeReport ? (
        <Link
          className={pathname === "/management" ? "nav-item active" : "nav-item"}
          to="/management"
        >
          <BarChart3 aria-hidden="true" size={20} />
          <span>דו"ח מנהלים</span>
        </Link>
      ) : null}
    </nav>
  );
}

