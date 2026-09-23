import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RoomStatus, UserRole } from "../../types";
import { ChatFab } from "../components/ChatFab";
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

type RoomStatusKey = "closed" | "transition" | "open";

const roomStatusMeta: Array<{
  key: RoomStatusKey;
  label: string;
  color: string;
  legendClass: string;
}> = [
  { key: "closed", label: "עברו", color: "var(--success)", legendClass: "success" },
  { key: "transition", label: "במעבר", color: "var(--warning)", legendClass: "warning" },
  { key: "open", label: "לא עברו", color: "var(--destructive)", legendClass: "destructive" },
];

type GroupProgressRow = {
  id: number;
  label: string;
  total: number;
  closed: number;
  transition: number;
  open: number;
  progress: number;
  closedPct: number;
  transitionPct: number;
  openPct: number;
};

function DonutTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value?: number; payload?: { label: string } }>;
}) {
  const entry = payload?.[0];

  if (!active || !entry?.payload) {
    return null;
  }

  return (
    <div className="chart-tooltip" dir="rtl">
      <strong>{entry.payload.label}</strong>
      <span>{entry.value ?? 0} חדרים</span>
    </div>
  );
}

function groupTooltipText(row: GroupProgressRow) {
  return `${row.label} — עברו: ${row.closed}, במעבר: ${row.transition}, לא עברו: ${row.open} (${row.total} חדרים · ${Math.round(row.progress * 100)}% הושלם)`;
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
  const totalVisibleRooms = closedCount + openCount + transitionCount;
  const completionPct = totalVisibleRooms
    ? Math.round((closedCount / totalVisibleRooms) * 100)
    : 0;

  const statusData: Array<{ key: RoomStatusKey; label: string; value: number; color: string }> =
    roomStatusMeta.map((meta) => ({
      ...meta,
      value:
        meta.key === "closed" ? closedCount : meta.key === "open" ? openCount : transitionCount,
    }));
  const hasMultipleSlices = statusData.filter((entry) => entry.value > 0).length > 1;

  const groupProgress: GroupProgressRow[] = visibleGroups
    .map((group) => {
      const groupRooms = rooms.filter((room) => room.group_id === group.id);
      const closed = groupRooms.filter(
        (room) => room.room_status === RoomStatus.CLOSED_ROOM,
      ).length;
      const open = groupRooms.filter(
        (room) => room.room_status === RoomStatus.WAITING_FOR_STATUS,
      ).length;
      const transition = groupRooms.filter(
        (room) =>
          room.room_status === RoomStatus.PACKING_PROCESS ||
          room.room_status === RoomStatus.WAITING_GRITA,
      ).length;
      const total = groupRooms.length;

      return {
        id: group.id,
        label: getGroupLabel(group),
        total,
        closed,
        transition,
        open,
        progress: total ? closed / total : 0,
        closedPct: total ? (closed / total) * 100 : 0,
        transitionPct: total ? (transition / total) * 100 : 0,
        openPct: total ? (open / total) * 100 : 0,
      };
    })
    .filter((group) => group.total > 0)
    .sort((a, b) => b.progress - a.progress || b.total - a.total);

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
          <h2>התקדמות כוללת</h2>
          <span className="chart-subtitle">{totalVisibleRooms} חדרים סה״כ</span>
        </div>
        <div className="donut-wrap">
          {totalVisibleRooms > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={90}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={hasMultipleSlices ? 3 : 0}
                    cornerRadius={6}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<DonutTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <strong>{completionPct}%</strong>
                <span>הושלם</span>
              </div>
            </>
          ) : (
            <p className="state-message">אין נתונים להצגה.</p>
          )}
        </div>
        {totalVisibleRooms > 0 ? (
          <ul className="donut-legend">
            {statusData.map((entry) => (
              <li key={entry.key}>
                <span
                  className="donut-legend-dot"
                  style={{ background: entry.color }}
                  aria-hidden="true"
                />
                <span className="donut-legend-label">{entry.label}</span>
                <span className="donut-legend-value">{entry.value}</span>
                <span className="donut-legend-pct">
                  {Math.round((entry.value / totalVisibleRooms) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="chart-card card-soft">
        <div className="section-head">
          <h2>פילוח לפי קבוצה</h2>
        </div>
        <div className="legend" aria-label="מקרא סטטוסים">
          {roomStatusMeta.map((meta) => (
            <span key={meta.key} className={`legend-item ${meta.legendClass}`}>
              {meta.label}
            </span>
          ))}
        </div>
        {groupProgress.length > 0 ? (
          <>
            <div className="bar-chart-wrap">
              {groupProgress.map((row) => {
                const segments = roomStatusMeta
                  .map((meta) => ({
                    key: meta.key,
                    color: meta.color,
                    pct:
                      meta.key === "closed"
                        ? row.closedPct
                        : meta.key === "transition"
                          ? row.transitionPct
                          : row.openPct,
                  }))
                  .filter((segment) => segment.pct > 0);

                return (
                  <div className="bar-row" key={row.id}>
                    <div className="bar-row-label">{row.label}</div>
                    <div className="bar-track" title={groupTooltipText(row)}>
                      {segments.map((segment, index) => {
                        let radius = "0";

                        if (segments.length === 1) {
                          radius = "4px";
                        } else if (index === 0) {
                          radius = "4px 0 0 4px";
                        } else if (index === segments.length - 1) {
                          radius = "0 4px 4px 0";
                        }

                        return (
                          <div
                            key={segment.key}
                            className="bar-segment"
                            style={{
                              width: `${segment.pct}%`,
                              background: segment.color,
                              borderRadius: radius,
                              borderInlineEnd:
                                index < segments.length - 1
                                  ? "2px solid var(--card)"
                                  : undefined,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid-axis">
              <div />
              <div className="grid-axis-ticks">
                <span style={{ left: "0%" }}>0%</span>
                <span style={{ left: "25%" }}>25%</span>
                <span style={{ left: "50%" }}>50%</span>
                <span style={{ left: "75%" }}>75%</span>
                <span style={{ left: "100%" }}>100%</span>
              </div>
            </div>
          </>
        ) : (
          <p className="state-message">אין נתונים להצגה.</p>
        )}
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
      <ChatFab />
    </MobileShell>
  );
}
