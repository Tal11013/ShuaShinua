import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  Inbox,
  PackagePlus,
  Send,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { MovingUnitStatus, PackingUnitStatus } from "../../types";
import { MobileShell } from "../components/MobileShell";
import { useRelocation } from "../state/relocation";

function ProcessCard({
  title,
  description,
  to,
  Icon,
  count,
  enabled,
}: {
  title: string;
  description: string;
  to: string;
  Icon: LucideIcon;
  count?: number;
  enabled: boolean;
}) {
  const content = (
    <>
      <span className="icon-tile">
        <Icon aria-hidden="true" size={22} />
      </span>
      <span className="process-copy">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="process-indicator">
        {typeof count === "number" ? (
          <span className={enabled ? "counter-badge active" : "counter-badge"}>
            {count}
          </span>
        ) : (
          <ChevronLeft aria-hidden="true" size={20} />
        )}
      </span>
    </>
  );

  if (!enabled) {
    return (
      <div className="process-card disabled" aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link className="process-card" to={to}>
      {content}
    </Link>
  );
}

export function ProcessesRoute() {
  const { error, loading, transports, units } = useRelocation();
  const closedUnits = units.filter(
    (unit) => unit.packing_status === PackingUnitStatus.PACKING_CLOSED,
  ).length;
  const activeTransports = transports.filter(
    (transport) => transport.moving_status === MovingUnitStatus.ON_WAY,
  ).length;
  const receivedUnits = units.filter(
    (unit) => unit.packing_status === PackingUnitStatus.PACKING_RECEIVED,
  ).length;

  return (
    <MobileShell title="שינוע ציוד" subtitle="בחר/י פעולה אחת להמשך">
      {loading ? <p className="state-message">טוען נתונים...</p> : null}
      {error ? <p className="state-message error">{error}</p> : null}
      <section className="process-list">
        <ProcessCard
          title="יצירת אריזה"
          description="פתיחת יחידת אריזה לחדר ומיון פריטים"
          to="/packing"
          Icon={PackagePlus}
          enabled
        />
        <ProcessCard
          title="יצירת הובלה"
          description="טעינת אריזות סגורות על יחידת הובלה"
          to="/transport"
          Icon={Truck}
          count={closedUnits}
          enabled={closedUnits > 0}
        />
        <ProcessCard
          title="קבלת ציוד"
          description="אישור הגעה ופריקת יחידת הובלה"
          to="/receiving"
          Icon={Inbox}
          count={activeTransports}
          enabled={activeTransports > 0}
        />
        <ProcessCard
          title="פיזור ציוד"
          description="חלוקת פריטים מאריזה שהתקבלה"
          to="/distribution"
          Icon={Send}
          count={receivedUnits}
          enabled={receivedUnits > 0}
        />
      </section>
    </MobileShell>
  );
}

