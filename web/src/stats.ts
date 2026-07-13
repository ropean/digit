import type { Commit } from "./types";

const DAY_MS = 86400000;

export interface AuthorAgg {
  name: string;
  email: string;
  commitCount: number;
  additions: number;
  deletions: number;
}

export function computeAuthorStats(commits: Commit[]): AuthorAgg[] {
  const map = new Map<string, AuthorAgg>();
  for (const c of commits) {
    const key = c.authorEmail || c.authorName;
    let a = map.get(key);
    if (!a) {
      a = { name: c.authorName, email: c.authorEmail, commitCount: 0, additions: 0, deletions: 0 };
      map.set(key, a);
    }
    a.commitCount++;
    a.additions += c.insertions;
    a.deletions += c.deletions;
  }
  return [...map.values()].sort((x, y) => y.commitCount - x.commitCount);
}

export interface FileAgg {
  path: string;
  changeCount: number;
  additions: number;
  deletions: number;
  lastModified: string;
  authors: string[];
}

export function computeFileStats(commits: Commit[]): FileAgg[] {
  const map = new Map<string, FileAgg & { authorSet: Set<string> }>();
  for (const c of commits) {
    for (const f of c.files ?? []) {
      let s = map.get(f.path);
      if (!s) {
        s = { path: f.path, changeCount: 0, additions: 0, deletions: 0, lastModified: c.date, authors: [], authorSet: new Set() };
        map.set(f.path, s);
      }
      s.changeCount++;
      s.additions += f.insertions;
      s.deletions += f.deletions;
      s.authorSet.add(c.authorName);
      if (new Date(c.date) > new Date(s.lastModified)) s.lastModified = c.date;
    }
  }
  return [...map.values()]
    .map((s) => ({ path: s.path, changeCount: s.changeCount, additions: s.additions, deletions: s.deletions, lastModified: s.lastModified, authors: [...s.authorSet] }))
    .sort((a, b) => b.changeCount - a.changeCount);
}

export interface HeatmapCell {
  date: string | null;
  count: number;
}
export interface HeatmapWeek {
  cells: HeatmapCell[];
}
export interface HeatmapMonthLabel {
  weekIndex: number;
  label: string;
}
export interface CommitHeatmap {
  weeks: HeatmapWeek[];
  monthLabels: HeatmapMonthLabel[];
  maxCount: number;
}

// Distinct calendar years with at least one commit, newest first — drives
// the heatmap's year picker.
export function commitYears(commits: Commit[]): number[] {
  const years = new Set<number>();
  for (const c of commits) {
    const y = Number(c.date.slice(0, 4));
    if (!Number.isNaN(y)) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

// Buckets one calendar year (Jan 1 - Dec 31) into a GitHub-style grid:
// columns are weeks (Sunday-start), rows are weekdays. Padded with
// out-of-year cells (date: null) so every week column has exactly 7 rows.
export function computeCommitHeatmapForYear(commits: Commit[], year: number): CommitHeatmap {
  const days = new Map<string, number>();
  for (const c of commits) {
    const key = c.date.slice(0, 10);
    if (Number(key.slice(0, 4)) !== year) continue;
    days.set(key, (days.get(key) ?? 0) + 1);
  }

  const start = new Date(Date.UTC(year, 0, 1));
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const end = new Date(Date.UTC(year, 11, 31));
  end.setUTCDate(end.getUTCDate() + (6 - end.getUTCDay()));

  const weeks: HeatmapWeek[] = [];
  const monthLabels: HeatmapMonthLabel[] = [];
  let maxCount = 0;
  let lastMonth = -1;
  let weekIndex = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 7 * DAY_MS) {
    const cells: HeatmapCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const cursor = new Date(t + dow * DAY_MS);
      const inYear = cursor.getUTCFullYear() === year;
      if (dow === 0 && inYear) {
        const month = cursor.getUTCMonth();
        if (month !== lastMonth) {
          monthLabels.push({ weekIndex, label: cursor.toLocaleString("en-US", { month: "short", timeZone: "UTC" }) });
          lastMonth = month;
        }
      }
      if (!inYear) {
        cells.push({ date: null, count: 0 });
        continue;
      }
      const key = cursor.toISOString().slice(0, 10);
      const count = days.get(key) ?? 0;
      maxCount = Math.max(maxCount, count);
      cells.push({ date: key, count });
    }
    weeks.push({ cells });
    weekIndex++;
  }
  return { weeks, monthLabels: dropCrampedLabels(monthLabels), maxCount };
}

// A label lands every time the calendar crosses a month boundary, which can
// be a single week after the previous one when the visible range starts
// right before a boundary — two 3-letter labels one column (14px) apart
// overlap into unreadable text. Drop labels that don't have room.
const MIN_LABEL_GAP_WEEKS = 3;
function dropCrampedLabels(labels: HeatmapMonthLabel[]): HeatmapMonthLabel[] {
  const kept: HeatmapMonthLabel[] = [];
  for (const label of labels) {
    const prev = kept[kept.length - 1];
    if (prev && label.weekIndex - prev.weekIndex < MIN_LABEL_GAP_WEEKS) continue;
    kept.push(label);
  }
  return kept;
}

export interface CouplingPair {
  a: string;
  b: string;
  count: number;
}
export interface CouplingNode {
  path: string;
  changeCount: number;
}

// Commits touching more files than this are still counted toward each
// file's changeCount, but skipped for pairwise coupling — that loop is
// O(k^2) per commit, and a handful of huge commits (a vendor bump, an
// initial import) can otherwise dwarf the cost of every other commit
// combined.
const COUPLING_FILE_CAP = 60;

export function computeCoupling(commits: Commit[], topN: number): { pairs: CouplingPair[]; nodes: CouplingNode[] } {
  const pairCounts = new Map<string, number>();
  const changeCount = new Map<string, number>();
  for (const c of commits) {
    const paths = (c.files ?? []).map((f) => f.path);
    for (const p of paths) changeCount.set(p, (changeCount.get(p) ?? 0) + 1);
    if (paths.length > COUPLING_FILE_CAP) continue;
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const key = [paths[i], paths[j]].sort().join("|||");
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }
  const pairs = [...pairCounts.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split("|||");
      return { a, b, count };
    })
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  const nodesSet = new Set<string>();
  for (const p of pairs) {
    nodesSet.add(p.a);
    nodesSet.add(p.b);
  }
  const nodes = [...nodesSet].map((path) => ({ path, changeCount: changeCount.get(path) ?? 0 }));
  return { pairs, nodes };
}

export interface KeywordCount {
  word: string;
  count: number;
}

export function computeKeywords(commits: Commit[]): KeywordCount[] {
  const counts = new Map<string, number>();
  for (const c of commits) {
    const m = c.subject.match(/^([a-zA-Z]+)(\(.+\))?:/);
    const word = m ? m[1].toLowerCase() : "other";
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
}

export interface SurvivalMonth {
  month: string;
  added: number;
  surviving: number;
}

// Deterministic pseudo-random in [0,1) derived from a string, so re-renders
// are stable without needing a stored seed.
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// Estimates how many of a month's added lines are still present today.
// There's no real blame data behind this — it's a decay curve applied to
// real "lines added per month" counts, clearly labeled as an estimate in
// the UI. A true answer would require running `git blame` across the
// whole tree, which is out of scope for this report.
export function computeSurvival(commits: Commit[]): SurvivalMonth[] {
  const monthMap = new Map<string, number>();
  for (const c of commits) {
    const key = c.date.slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + c.insertions);
  }
  const months = [...monthMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  return months.map(([month, added], i) => {
    const monthsAgo = months.length - 1 - i;
    const decay = Math.max(0.35, Math.pow(0.965, monthsAgo * 3) - hash01(month) * 0.05);
    return { month, added, surviving: Math.round(added * decay) };
  });
}

export interface CommitContext {
  filesCount: number;
  avgFilesPerCommit: number;
  sizePercentile: number;
  sequenceIndex: number;
  totalCommits: number;
  authorGapDays: number | null;
  isMerge: boolean;
}

// Places a single commit in the context of the whole repo's history — the
// raw +/- numbers on a commit mean little without something to compare them
// to (is 11 files a lot? is this commit part of a burst or a lull?).
export function computeCommitContext(commit: Commit, allCommits: Commit[]): CommitContext {
  const totalFiles = allCommits.reduce((sum, c) => sum + (c.files?.length ?? 0), 0);
  const avgFilesPerCommit = allCommits.length ? totalFiles / allCommits.length : 0;

  const mySize = commit.insertions + commit.deletions;
  const sizes = allCommits.map((c) => c.insertions + c.deletions).sort((a, b) => a - b);
  const smallerOrEqual = sizes.filter((s) => s <= mySize).length;
  const sizePercentile = sizes.length ? Math.round((smallerOrEqual / sizes.length) * 100) : 0;

  const sorted = [...allCommits].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const idx = sorted.findIndex((c) => c.hash === commit.hash);

  let authorGapDays: number | null = null;
  for (let i = idx - 1; i >= 0; i--) {
    if (sorted[i].authorName === commit.authorName) {
      authorGapDays = Math.round((new Date(commit.date).getTime() - new Date(sorted[i].date).getTime()) / DAY_MS);
      break;
    }
  }

  return {
    filesCount: commit.files?.length ?? 0,
    avgFilesPerCommit,
    sizePercentile,
    sequenceIndex: idx + 1,
    totalCommits: allCommits.length,
    authorGapDays,
    isMerge: (commit.parents?.length ?? 0) > 1,
  };
}
