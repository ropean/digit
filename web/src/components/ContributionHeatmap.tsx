import { useMemo, useState } from "react";
import type { Commit } from "../types";
import { commitYears, computeCommitHeatmapForYear } from "../stats";
import { heatmapColor } from "../theme";
import { formatDate } from "../format";
import { useElementWidth } from "../useElementWidth";

const MIN_CELL = 8;
const MAX_CELL = 13;
const GAP = 3;
const LABEL_WIDTH = 34;
const CELL_LEGEND = 11;
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function levelFor(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export function ContributionHeatmap({ commits }: { commits: Commit[] }) {
  const years = useMemo(() => commitYears(commits), [commits]);
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const selectedYear = pickedYear != null && years.includes(pickedYear) ? pickedYear : years[0];
  const heatmap = useMemo(
    () => (selectedYear != null ? computeCommitHeatmapForYear(commits, selectedYear) : null),
    [commits, selectedYear],
  );
  const [wrapRef, width] = useElementWidth<HTMLDivElement>();

  if (!heatmap || years.length === 0) {
    return <div className="empty-state">Not enough data to plot a heatmap</div>;
  }

  // Cells scale to fill the measured container width (clamped to a sane
  // range) instead of a fixed pixel size that leaves wide cards mostly
  // empty or, on narrow ones, forces a horizontal scrollbar.
  const weeks = heatmap.weeks.length;
  const available = Math.max(0, width - LABEL_WIDTH);
  const rawStep = width > 0 && weeks > 0 ? available / weeks : MAX_CELL + GAP;
  const step = Math.min(MAX_CELL + GAP, Math.max(MIN_CELL + GAP, rawStep));
  const cell = step - GAP;

  return (
    <div ref={wrapRef}>
      <div className="heatmap-scroll">
        <div className="heatmap-inner">
          <div className="heatmap-months" style={{ marginLeft: LABEL_WIDTH }}>
            {heatmap.monthLabels.map((m) => (
              <span key={m.weekIndex} style={{ position: "absolute", left: m.weekIndex * step }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="heatmap-body">
            <div className="heatmap-daylabels" style={{ width: LABEL_WIDTH - 8 }}>
              {DAY_LABELS.map((label, i) => (
                <span key={i} style={{ height: cell, marginBottom: i === 6 ? 0 : GAP, lineHeight: `${cell}px` }}>
                  {label}
                </span>
              ))}
            </div>
            <div className="heatmap-grid">
              {heatmap.weeks.map((week, wi) => (
                <div key={wi} className="heatmap-week" style={{ width: cell, marginRight: wi === heatmap.weeks.length - 1 ? 0 : GAP }}>
                  {week.cells.map((cellData, di) => {
                    const level = levelFor(cellData.count, heatmap.maxCount);
                    return (
                      <div
                        key={di}
                        className="heatmap-cell"
                        style={{ width: cell, height: cell, marginBottom: di === 6 ? 0 : GAP, background: heatmapColor(level, "var(--surface-2)") }}
                        title={cellData.date ? `${cellData.count} commit${cellData.count === 1 ? "" : "s"} on ${formatDate(cellData.date)}` : undefined}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="heatmap-controls">
        <div className="heatmap-years">
          {years.map((y) => (
            <button
              key={y}
              className={"year-btn" + (y === selectedYear ? " active" : "")}
              title={String(y)}
              onClick={() => setPickedYear(y)}
            >
              &apos;{String(y).slice(2)}
            </button>
          ))}
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className="heatmap-cell" style={{ width: CELL_LEGEND, height: CELL_LEGEND, background: heatmapColor(level, "var(--surface-2)") }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
