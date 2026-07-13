import { useMemo, useState } from "react";
import type { DensityDay } from "../stats";
import { formatDate } from "../format";

const DAY_MS = 86400000;

interface Props {
  minDate: Date;
  maxDate: Date;
  dateFrom: Date;
  dateTo: Date;
  quickRange: string;
  density: DensityDay[];
  onQuickRange: (id: string) => void;
  onApplyCustomRange: (fromIso: string, toIso: string) => void;
  onRangeFrom: (dayIndex: number) => void;
  onRangeTo: (dayIndex: number) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

const QUICK_DEFS = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

export function TimelineFilterBar(props: Props) {
  const { minDate, maxDate, dateFrom, dateTo, quickRange, density } = props;
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const totalDaySpan = Math.max(1, Math.round((maxDate.getTime() - minDate.getTime()) / DAY_MS));
  const fromDayIndex = Math.round((dateFrom.getTime() - minDate.getTime()) / DAY_MS);
  const toDayIndex = Math.round((dateTo.getTime() - minDate.getTime()) / DAY_MS);
  const maxDensity = useMemo(() => Math.max(1, ...density.map((d) => d.count)), [density]);

  const openCustom = () => {
    setDraftFrom(formatDate(dateFrom.toISOString()));
    setDraftTo(formatDate(dateTo.toISOString()));
    setCustomOpen(true);
  };
  const applyCustom = () => {
    if (draftFrom && draftTo) props.onApplyCustomRange(draftFrom, draftTo);
    setCustomOpen(false);
  };

  return (
    <div className="timeline-bar">
      <div className="quick-row">
        {QUICK_DEFS.map((q) => (
          <button
            key={q.id}
            className={"quick-btn" + (quickRange === q.id ? " active" : "")}
            onClick={() => props.onQuickRange(q.id)}
          >
            {q.label}
          </button>
        ))}
        <div style={{ position: "relative" }}>
          <button
            className={"quick-btn" + (quickRange === "custom" ? " active" : "")}
            onClick={openCustom}
          >
            Custom range…
          </button>
          {customOpen && (
            <>
              <div className="popover-backdrop" onClick={() => setCustomOpen(false)} />
              <div className="custom-range-popover">
                <div className="popover-row">
                  <label>From</label>
                  <input type="date" className="date-input" value={draftFrom} onChange={(e) => setDraftFrom(e.target.value)} />
                </div>
                <div className="popover-row">
                  <label>To</label>
                  <input type="date" className="date-input" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} />
                </div>
                <div className="popover-actions">
                  <button className="pager-btn" onClick={() => setCustomOpen(false)}>Cancel</button>
                  <button className="quick-btn active" onClick={applyCustom} disabled={!draftFrom || !draftTo}>
                    Apply
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        {props.hasActiveFilters && (
          <button className="clear-btn" onClick={props.onClearFilters}>
            Clear filters ({props.filteredCount} / {props.totalCount})
          </button>
        )}
      </div>
      <div className="density-wrap">
        <div className="density-bars">
          {density.map((d) => {
            const t = new Date(d.date).getTime();
            const inRange = t >= dateFrom.getTime() && t <= dateTo.getTime();
            return (
              <div
                key={d.date}
                className="density-bar"
                title={`${d.date}: ${d.count} commit${d.count === 1 ? "" : "s"}`}
                style={{
                  height: `${4 + (d.count / maxDensity) * 40}px`,
                  background: inRange ? "var(--accent)" : "var(--baseline)",
                  opacity: inRange ? 0.9 : 0.5,
                }}
              />
            );
          })}
        </div>
        <input
          type="range"
          className="range-input"
          min={0}
          max={totalDaySpan}
          value={fromDayIndex}
          onChange={(e) => props.onRangeFrom(Number(e.target.value))}
        />
        <input
          type="range"
          className="range-input range-input-top"
          min={0}
          max={totalDaySpan}
          value={toDayIndex}
          onChange={(e) => props.onRangeTo(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
