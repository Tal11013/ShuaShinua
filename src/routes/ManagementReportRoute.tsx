import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RoomStatus, UserRole } from "../../types";
import { MobileShell } from "../components/MobileShell";
import { getGroupLabel } from "../domain/display";
import type { GroupReportRow } from "../domain/report";
import { useRelocation } from "../state/relocation";

const statusLabel = {
  NOT_MOVED: "טרם עבר",
  MOVING: "בתנועה",
  MOVED: "עבר",
};

const statusClass = {
  NOT_MOVED: "neutral",
  MOVING: "warning",
  MOVED: "success",
};

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

async function readError(response: Response) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error ?? "אירעה שגיאה בטעינת הדו״ח.";
}

export function ManagementReportRoute() {
  const { api, currentUser, groups, rooms } = useRelocation();
  const [rows, setRows] = useState<GroupReportRow[]>([]);
  const [unitId, setUnitId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unitIds = useMemo(
    () => Array.from(new Set(groups.map((group) => group.unit_id))),
    [groups],
  );
  const canAccess =
    currentUser?.role === UserRole.UNIT_MANAGER ||
    currentUser?.role === UserRole.GLOBAL_MANAGER;
  const visibleGroups = unitId
    ? groups.filter((group) => group.unit_id === unitId)
    : groups;
  const visibleGroupIds = new Set(visibleGroups.map((group) => group.id));
  const visibleRooms = rooms.filter((room) => visibleGroupIds.has(room.group_id));
  const closedCount = visibleRooms.filter(
    (room) => room.room_status === RoomStatus.CLOSED_ROOM,
  ).length;
  const openCount = visibleRooms.filter(
    (room) => room.room_status === RoomStatus.WAITING_FOR_STATUS,
  ).length;
  const transitionCount = visibleRooms.filter(
    (room) =>
      room.room_status === RoomStatus.PACKING_PROCESS ||
      room.room_status === RoomStatus.WAITING_GRITA,
  ).length;
  const chartData = visibleGroups.map((group) => {
    const groupRooms = rooms.filter((room) => room.group_id === group.id);

    return {
      label: getGroupLabel(group),
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

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    if (!canAccess) {
      setLoading(false);
      setError("אין הרשאה לדו״ח מנהלים.");
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();

    if (unitId) {
      params.set("unit_id", unitId);
    }

    setLoading(true);
    setError(null);

    api(`/api/management-report${params.size ? `?${params}` : ""}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readError(response));
        }

        return response.json() as Promise<{ rows: GroupReportRow[] }>;
      })
      .then((body) => setRows(body.rows))
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : "אירעה שגיאה.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [api, canAccess, currentUser, unitId]);

  return (
    <MobileShell title="דו״ח מנהלים">
      {unitIds.length > 1 ? (
        <section className="card-soft flow-card">
          <label className="select-label">
            יחידה
            <select value={unitId} onChange={(event) => setUnitId(event.target.value)}>
              <option value="">כל היחידות</option>
              {unitIds.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : null}

      {loading ? <p className="state-message">טוען נתונים...</p> : null}
      {error ? <p className="state-message error">{error}</p> : null}

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
          <h2>פילוח לפי קבוצה</h2>
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
                dataKey="label"
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

      {!loading && !error && rows.length === 0 ? (
        <p className="state-message">אין נתונים להצגה.</p>
      ) : null}

      <section className="report-list" aria-label="סטטוס מעבר לפי קבוצה">
        {rows.map((row) => (
          <article className="report-row card-soft" key={row.group_id}>
            <div>
              <h2>{row.label}</h2>
              <p>יחידה {row.unit_id}</p>
            </div>
            <span className={`status-chip ${statusClass[row.status]}`}>
              {statusLabel[row.status]}
            </span>
            <dl>
              <div>
                <dt>חדרים</dt>
                <dd>{row.totalRooms}</dd>
              </div>
              <div>
                <dt>בתנועה</dt>
                <dd>{row.movingUnits}</dd>
              </div>
              <div>
                <dt>עברו</dt>
                <dd>{row.movedUnits}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </MobileShell>
  );
}

