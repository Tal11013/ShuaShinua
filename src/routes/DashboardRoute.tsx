import { Link } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RoomStatus } from "../../types";
import { GhostButton, MobileShell, PrimaryButton } from "../components/MobileShell";
import { useRelocation } from "../state/relocation";

const chartLabels = {
  closed: "עברו",
  open: "לא עברו",
  transition: "במעבר",
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: keyof typeof chartLabels; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip" dir="rtl">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <span key={entry.name}>
          {entry.name ? chartLabels[entry.name] : ""}: {entry.value ?? 0}
        </span>
      ))}
    </div>
  );
}

export function DashboardRoute() {
  const { groups, rooms, resetAll } = useRelocation();
  const closedCount = rooms.filter(
    (room) => room.room_status === RoomStatus.CLOSED_ROOM,
  ).length;
  const openCount = rooms.filter(
    (room) => room.room_status === RoomStatus.WAITING_FOR_STATUS,
  ).length;
  const transitionCount = rooms.filter(
    (room) =>
      room.room_status === RoomStatus.PACKING_PROCESS ||
      room.room_status === RoomStatus.WAITING_GRITA,
  ).length;

  const chartData = groups.map((group) => {
    const groupRooms = rooms.filter((room) => room.group_id === group.id);

    return {
      branch: group.branch,
      closed: groupRooms.filter(
        (room) => room.room_status === RoomStatus.CLOSED_ROOM,
      ).length,
      open: groupRooms.filter(
        (room) => room.room_status === RoomStatus.WAITING_FOR_STATUS,
      ).length,
      transition: groupRooms.filter(
        (room) =>
          room.room_status === RoomStatus.PACKING_PROCESS ||
          room.room_status === RoomStatus.WAITING_GRITA,
      ).length,
    };
  });

  return (
    <MobileShell title="פינוי ציוד">
      <section className="hero-card card-soft">
        <div>
          <p className="eyebrow">מרכז שליטה</p>
          <h2>ניהול פינוי ציוד בין חדרים</h2>
          <p>
            מעקב אחרי חדרים, אריזות והובלות בתהליך אחד ברור עם סטטוס גלוי בכל
            שלב.
          </p>
        </div>
        <Link to="/processes">
          <PrimaryButton>כניסה לפינוי ציוד</PrimaryButton>
        </Link>
      </section>

      <section className="kpi-grid" aria-label="סיכום חדרים">
        <article className="kpi card-soft">
          <span>חדרים שעברו</span>
          <strong className="text-success">{closedCount}</strong>
        </article>
        <article className="kpi card-soft">
          <span>חדרים שלא עברו</span>
          <strong className="text-destructive">{openCount}</strong>
        </article>
        <article className="kpi card-soft">
          <span>חדרים במעבר</span>
          <strong className="text-warning">{transitionCount}</strong>
        </article>
      </section>

      <section className="chart-card card-soft">
        <div className="section-head">
          <h2>פילוח לפי ענף</h2>
          <GhostButton className="compact-button" onClick={resetAll}>
            <RotateCcw aria-hidden="true" size={16} />
            איפוס
          </GhostButton>
        </div>
        <div className="legend" aria-label="מקרא סטטוסים">
          <span className="legend-item success">עברו</span>
          <span className="legend-item destructive">לא עברו</span>
          <span className="legend-item warning">במעבר</span>
        </div>
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 0, left: 8, bottom: 0 }}
            >
              <XAxis type="number" allowDecimals={false} hide />
              <YAxis
                type="category"
                dataKey="branch"
                width={88}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="closed" stackId="rooms" fill="var(--success)" />
              <Bar dataKey="open" stackId="rooms" fill="var(--destructive)" />
              <Bar dataKey="transition" stackId="rooms" fill="var(--warning)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </MobileShell>
  );
}

