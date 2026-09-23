import { forwardRef } from "react";

export type PrintStatusSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

export type PrintGroupBar = {
  id: number;
  label: string;
  total: number;
  closed: number;
  transition: number;
  open: number;
  progress: number;
  segments: Array<{ key: string; color: string; pct: number }>;
};

export type PrintTableRow = {
  id: number;
  label: string;
  unitId: string;
  statusLabel: string;
  statusColor: string;
  totalRooms: number;
  movingUnits: number;
  movedUnits: number;
};

// Rendered off-screen (see .pdf-doc-host in styles.css) and captured with
// html2canvas for PDF export. Kept to solid fills, borders and text only —
// no SVG, no gradients — since those are the CSS features html2canvas
// renders reliably; text still comes out correctly shaped in Hebrew because
// html2canvas delegates it to the browser's own canvas text engine.
export const ManagementReportPrintView = forwardRef<
  HTMLDivElement,
  {
    generatedAt: Date;
    unitLabel: string;
    operatorName: string | null;
    totalRooms: number;
    statusSlices: PrintStatusSlice[];
    completionPct: number;
    insights: string[];
    groupBars: PrintGroupBar[];
    tableRows: PrintTableRow[];
  }
>(function ManagementReportPrintView(
  {
    generatedAt,
    unitLabel,
    operatorName,
    totalRooms,
    statusSlices,
    completionPct,
    insights,
    groupBars,
    tableRows,
  },
  ref,
) {
  const generatedLabel = generatedAt.toLocaleString("he-IL", {
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="pdf-doc" ref={ref} dir="rtl">
      <div className="pdf-topbar" />

      <header className="pdf-header">
        <div>
          <p className="pdf-eyebrow">שינוע ציוד · מערכת ניהול מעבר</p>
          <h1>דו״ח מנהלים</h1>
        </div>
        <dl className="pdf-meta">
          <div>
            <dt>יחידה</dt>
            <dd>{unitLabel}</dd>
          </div>
          <div>
            <dt>הופק בתאריך</dt>
            <dd>{generatedLabel}</dd>
          </div>
          {operatorName ? (
            <div>
              <dt>על ידי</dt>
              <dd>{operatorName}</dd>
            </div>
          ) : null}
        </dl>
      </header>

      <section className="pdf-kpis">
        <div className="pdf-kpi">
          <span>סה״כ חדרים</span>
          <strong>{totalRooms}</strong>
        </div>
        {statusSlices.map((slice) => (
          <div className="pdf-kpi" key={slice.key}>
            <span>{slice.label}</span>
            <strong style={{ color: slice.color }}>{slice.value}</strong>
          </div>
        ))}
      </section>

      <section className="pdf-summary">
        <div className="pdf-meter-block">
          <div className="pdf-meter-head">
            <span>התקדמות כוללת</span>
            <strong>{completionPct}%</strong>
          </div>
          <div className="pdf-meter-track">
            {statusSlices.map((slice) => (
              <div
                key={slice.key}
                className="pdf-meter-fill"
                style={{
                  width: totalRooms ? `${(slice.value / totalRooms) * 100}%` : "0%",
                  background: slice.color,
                }}
              />
            ))}
          </div>
          <div className="pdf-meter-legend">
            {statusSlices.map((slice) => (
              <span key={slice.key}>
                <i className="pdf-dot" style={{ background: slice.color }} />
                {slice.label} {slice.value} (
                {totalRooms ? Math.round((slice.value / totalRooms) * 100) : 0}%)
              </span>
            ))}
          </div>
        </div>

        <div className="pdf-insights">
          <h2>עיקרי הדברים</h2>
          <ul>
            {insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pdf-groups">
        <h2>פילוח לפי קבוצה</h2>
        {groupBars.length === 0 ? (
          <p className="pdf-empty">אין נתונים להצגה.</p>
        ) : (
          <div className="pdf-group-list">
            {groupBars.map((bar) => (
              <div className="pdf-group-row" key={bar.id}>
                <span className="pdf-group-label">{bar.label}</span>
                <div className="pdf-group-track">
                  {bar.segments.map((segment) => (
                    <div
                      key={segment.key}
                      className="pdf-group-segment"
                      style={{ width: `${segment.pct}%`, background: segment.color }}
                    />
                  ))}
                </div>
                <span className="pdf-group-pct">{Math.round(bar.progress * 100)}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pdf-table-section">
        <h2>נתוני קבוצות מפורטים</h2>
        {tableRows.length === 0 ? (
          <p className="pdf-empty">אין נתונים להצגה.</p>
        ) : (
          <table className="pdf-table">
            <thead>
              <tr>
                <th>קבוצה</th>
                <th>יחידה</th>
                <th>סטטוס</th>
                <th>חדרים</th>
                <th>בתנועה</th>
                <th>עברו</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.label}</td>
                  <td>{row.unitId}</td>
                  <td>
                    <span
                      className="pdf-status"
                      style={{ background: row.statusColor }}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  <td>{row.totalRooms}</td>
                  <td>{row.movingUnits}</td>
                  <td>{row.movedUnits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="pdf-footer">
        <span>מסמך זה הופק אוטומטית ממערכת שינוע ציוד ואינו מהווה מסמך רשמי חתום.</span>
        <span>{generatedLabel}</span>
      </footer>
    </div>
  );
});
