import { useState } from "react";
import { formatDate } from "../format";

interface Props {
  dateFrom: Date;
  dateTo: Date;
  quickRange: string;
  onQuickRange: (id: string) => void;
  onApplyCustomRange: (fromIso: string, toIso: string) => void;
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
  const { dateFrom, dateTo, quickRange } = props;
  const [customOpen, setCustomOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");

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
    </div>
  );
}
