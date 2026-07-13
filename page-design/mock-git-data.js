// mock-git-data.js — deterministic mock Git repository data + derived stats for the
// Git history visualization prototype. Plain ES module, no dependencies.

// ---------- seeded RNG ----------
function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRng(seedStr) {
  const seedFn = hashStr(seedStr);
  return mulberry32(seedFn());
}
const randInt = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const choice = (rng, arr) => arr[Math.floor(rng() * arr.length)];
function weightedChoice(rng, items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------- static pools ----------
const AUTHOR_COLORS = ['#6EA8FE', '#F2A65A', '#7FD8A6', '#E8879E', '#C792EA', '#5FD0C0', '#F2C94C'];

const AUTHOR_POOL = [
  { name: 'Wei Chen', email: 'wei.chen@glint.dev' },
  { name: 'Sarah Kim', email: 'sarah.kim@glint.dev' },
  { name: 'Diego Alvarez', email: 'diego.alvarez@glint.dev' },
  { name: 'Priya Nair', email: 'priya.nair@glint.dev' },
  { name: 'Tom Becker', email: 'tom.becker@glint.dev' },
  { name: 'Yuki Tanaka', email: 'yuki.tanaka@glint.dev' },
  { name: 'Lena Kowalski', email: 'lena.kowalski@glint.dev' },
];

const WEB_APP_FILES = [
  'src/app/App.tsx', 'src/app/routes.tsx', 'src/app/App.css',
  'src/components/Button.tsx', 'src/components/Modal.tsx', 'src/components/Table.tsx',
  'src/components/Chart.tsx', 'src/components/Sidebar.tsx', 'src/components/Header.tsx',
  'src/components/Avatar.tsx', 'src/components/Tooltip.tsx', 'src/components/Drawer.tsx',
  'src/components/SearchBar.tsx',
  'src/pages/Dashboard.tsx', 'src/pages/Settings.tsx', 'src/pages/Login.tsx',
  'src/pages/Onboarding.tsx', 'src/pages/Reports.tsx',
  'src/hooks/useAuth.ts', 'src/hooks/useFetch.ts', 'src/hooks/useDebounce.ts', 'src/hooks/useTheme.ts',
  'src/lib/api.ts', 'src/lib/format.ts', 'src/lib/dateUtils.ts', 'src/lib/colorUtils.ts', 'src/lib/validation.ts',
  'src/store/authSlice.ts', 'src/store/uiSlice.ts', 'src/store/dataSlice.ts', 'src/store/index.ts',
  'src/styles/tokens.css', 'src/styles/globals.css', 'src/styles/theme.css',
  'tests/App.test.tsx', 'tests/Dashboard.test.tsx', 'tests/api.test.ts', 'tests/format.test.ts',
  'docs/README.md', 'docs/CONTRIBUTING.md', 'docs/ARCHITECTURE.md',
  'config/vite.config.ts', 'config/tsconfig.json', 'config/eslint.config.js',
  'package.json',
];
const WEB_APP_HOT = new Set(['src/app/App.tsx', 'src/pages/Dashboard.tsx', 'src/lib/api.ts', 'src/components/Table.tsx', 'src/store/dataSlice.ts', 'src/components/Chart.tsx']);

const API_SERVICE_FILES = [
  'src/controllers/auth.controller.ts', 'src/controllers/users.controller.ts',
  'src/controllers/orders.controller.ts', 'src/controllers/payments.controller.ts',
  'src/services/auth.service.ts', 'src/services/email.service.ts',
  'src/services/payment.service.ts', 'src/services/notification.service.ts',
  'src/models/user.model.ts', 'src/models/order.model.ts', 'src/models/payment.model.ts',
  'src/middleware/auth.middleware.ts', 'src/middleware/error.middleware.ts', 'src/middleware/rateLimit.middleware.ts',
  'src/routes/auth.routes.ts', 'src/routes/users.routes.ts', 'src/routes/orders.routes.ts',
  'src/utils/logger.ts', 'src/utils/validation.ts', 'src/utils/crypto.ts',
  'src/db/schema.ts', 'src/db/migrations/001_init.sql', 'src/db/migrations/002_add_orders.sql',
  'tests/auth.test.ts', 'tests/orders.test.ts', 'tests/payment.test.ts',
  'docs/README.md', 'docs/API.md',
  'docker/Dockerfile', 'docker/docker-compose.yml',
  'package.json',
];
const API_SERVICE_HOT = new Set(['src/controllers/orders.controller.ts', 'src/services/payment.service.ts', 'src/models/order.model.ts', 'src/middleware/auth.middleware.ts']);

const MSG_TYPES = ['feat', 'fix', 'refactor', 'docs', 'chore', 'test', 'perf', 'style'];
const MSG_WEIGHTS = [30, 24, 14, 6, 10, 9, 4, 3];
const FEATURES = ['筛选面板', '登录流程', '用户资料页', '搜索联想', '支付确认页', '通知中心', '权限校验', '数据导出', '深色模式', '分页组件', '拖拽排序', '批量操作'];
const BUGS = ['筛选结果不刷新', '时区显示错误', '空状态崩溃', '重复请求', '内存泄漏', '样式错位', '并发写入冲突', '缓存未失效', '边界条件报错'];
const MODULES = ['dashboard', 'auth', 'api client', 'table', 'sidebar', 'store', 'router', 'payments', 'orders', 'rate limiter', 'logger', 'schema'];
const DEPS = ['react', 'vite', 'eslint', 'typescript', 'zod', 'stripe-sdk', 'pg', 'jsonwebtoken'];

function makeMessage(rng, type) {
  switch (type) {
    case 'feat': return `feat: 新增${choice(rng, FEATURES)}`;
    case 'fix': return `fix: 修复${choice(rng, MODULES)}中${choice(rng, BUGS)}的问题`;
    case 'refactor': return `refactor: 简化 ${choice(rng, MODULES)} 逻辑`;
    case 'docs': return `docs: 更新 ${choice(rng, MODULES)} 相关文档`;
    case 'chore': return `chore: 升级 ${choice(rng, DEPS)} 依赖版本`;
    case 'test': return `test: 补充 ${choice(rng, MODULES)} 的测试用例`;
    case 'perf': return `perf: 优化 ${choice(rng, MODULES)} 渲染性能`;
    case 'style': return `style: 格式化 ${choice(rng, MODULES)} 代码`;
    default: return `chore: 杂项调整`;
  }
}

function shortHash(rng) {
  const chars = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 7; i++) s += chars[Math.floor(rng() * 16)];
  return s;
}

// ---------- repo generation ----------
function generateRepo(cfg) {
  const rng = makeRng(cfg.seed);
  const files = cfg.files;
  const hotSet = cfg.hot;
  const authors = cfg.authorNames.map((n, i) => {
    const a = AUTHOR_POOL.find(p => p.name === n);
    return { name: a.name, email: a.email, color: AUTHOR_COLORS[i % AUTHOR_COLORS.length], weight: cfg.authorWeights[i] };
  });
  const branches = cfg.branches;
  const now = cfg.now;
  const totalDays = cfg.days;

  const raw = [];
  const branchLast = {}; // branch -> hash
  branches.forEach(b => branchLast[b] = null);
  let mainTip = null;
  const featureCommitCounts = {};
  branches.forEach(b => featureCommitCounts[b] = 0);

  for (let i = 0; i < cfg.commitCount; i++) {
    // skew recency: more commits in recent days
    const u = rng();
    const dayOffset = Math.floor(totalDays * (1 - Math.pow(u, 1.6)));
    const date = new Date(now.getTime() - dayOffset * 86400000 - randInt(rng, 0, 82800000));
    const author = weightedChoice(rng, authors, authors.map(a => a.weight));
    let branch = weightedChoice(rng, branches, branches.map((b, i2) => (b === 'main' ? 60 : 40 / (branches.length - 1))));
    const type = weightedChoice(rng, MSG_TYPES, MSG_WEIGHTS);
    const message = makeMessage(rng, type);
    const nFiles = randInt(rng, 1, type === 'refactor' ? 6 : 4);
    const changedFiles = [];
    const pool = files.slice();
    for (let f = 0; f < nFiles; f++) {
      let pick;
      if (rng() < 0.55) {
        const hotArr = pool.filter(p => hotSet.has(p));
        pick = hotArr.length ? choice(rng, hotArr) : choice(rng, pool);
      } else {
        pick = choice(rng, pool);
      }
      const idx = pool.indexOf(pick);
      if (idx >= 0) pool.splice(idx, 1);
      if (!pick) continue;
      const big = rng() < 0.08;
      const additions = big ? randInt(rng, 60, 240) : randInt(rng, 1, 35);
      const deletions = big ? randInt(rng, 20, 160) : randInt(rng, 0, 20);
      const status = rng() < 0.06 ? 'added' : (rng() < 0.04 ? 'deleted' : 'modified');
      changedFiles.push({ path: pick, additions, deletions, status });
      if (!pool.length) break;
    }
    if (!changedFiles.length) changedFiles.push({ path: choice(rng, files), additions: randInt(rng, 1, 20), deletions: randInt(rng, 0, 10), status: 'modified' });

    featureCommitCounts[branch] = (featureCommitCounts[branch] || 0) + 1;
    raw.push({ tmpDate: date, author, branch, message, type, filesChanged: changedFiles });
  }

  raw.sort((a, b) => a.tmpDate - b.tmpDate);

  const commits = [];
  branches.forEach(b => branchLast[b] = null);
  raw.forEach((c, i) => {
    const hash = shortHash(makeRng(cfg.seed + '-h-' + i));
    let parents = [];
    if (c.branch === 'main') {
      if (mainTip) parents = [mainTip];
      // occasional merge of a feature branch that has enough commits
      const mergeable = branches.filter(b => b !== 'main' && featureCommitCounts[b] >= 4 && branchLast[b] && rng() < 0.05);
      if (mergeable.length) {
        const mb = choice(rng, mergeable);
        parents = mainTip ? [mainTip, branchLast[mb]] : [branchLast[mb]];
        c.message = `merge: 合并 ${mb} 到 main`;
        c.merge = true;
      }
      mainTip = hash;
    } else {
      parents = branchLast[c.branch] ? [branchLast[c.branch]] : (mainTip ? [mainTip] : []);
      branchLast[c.branch] = hash;
    }
    commits.push({
      hash,
      author: c.author.name,
      email: c.author.email,
      authorColor: c.author.color,
      date: c.tmpDate.toISOString(),
      message: c.message,
      type: c.type,
      filesChanged: c.filesChanged,
      branch: c.branch,
      parents: parents.filter(Boolean),
      merge: !!c.merge,
    });
  });

  const repo = {
    name: cfg.name,
    generatedAt: now.toISOString(),
    totalCommits: commits.length,
    branches,
  };
  return { repo, commits, authors, files: files.map(p => ({ path: p })) };
}

export function generateAllRepos() {
  const now = new Date('2026-07-10T09:00:00Z');
  const webApp = generateRepo({
    key: 'web-app', name: 'glint-web', seed: 'glint-web-seed-7',
    files: WEB_APP_FILES, hot: WEB_APP_HOT,
    authorNames: ['Wei Chen', 'Sarah Kim', 'Diego Alvarez', 'Priya Nair', 'Tom Becker'],
    authorWeights: [30, 24, 18, 16, 12],
    branches: ['main', 'feature/auth-revamp', 'feature/dashboard-v2', 'hotfix/perf-regression'],
    commitCount: 230, days: 220, now,
  });
  const apiService = generateRepo({
    key: 'api-service', name: 'glint-api', seed: 'glint-api-seed-3',
    files: API_SERVICE_FILES, hot: API_SERVICE_HOT,
    authorNames: ['Diego Alvarez', 'Priya Nair', 'Yuki Tanaka', 'Lena Kowalski'],
    authorWeights: [28, 26, 24, 22],
    branches: ['main', 'feature/payments', 'feature/rate-limit'],
    commitCount: 150, days: 180, now,
  });
  return { 'web-app': webApp, 'api-service': apiService };
}

// ---------- derived stats ----------
export function computeAuthorStats(commits) {
  const map = new Map();
  commits.forEach(c => {
    if (!map.has(c.author)) map.set(c.author, { name: c.author, email: c.email, color: c.authorColor, commitCount: 0, additions: 0, deletions: 0 });
    const a = map.get(c.author);
    a.commitCount++;
    c.filesChanged.forEach(f => { a.additions += f.additions; a.deletions += f.deletions; });
  });
  return [...map.values()].sort((a, b) => b.commitCount - a.commitCount);
}

export function computeFileStats(commits) {
  const map = new Map();
  commits.forEach(c => {
    c.filesChanged.forEach(f => {
      if (!map.has(f.path)) map.set(f.path, { path: f.path, changeCount: 0, additions: 0, deletions: 0, lastModified: c.date, authors: new Set() });
      const s = map.get(f.path);
      s.changeCount++;
      s.additions += f.additions;
      s.deletions += f.deletions;
      s.authors.add(c.author);
      if (new Date(c.date) > new Date(s.lastModified)) s.lastModified = c.date;
    });
  });
  return [...map.values()].map(s => ({ ...s, authors: [...s.authors] })).sort((a, b) => b.changeCount - a.changeCount);
}

export function computeDailyDensity(commits) {
  if (!commits.length) return [];
  const days = new Map();
  commits.forEach(c => {
    const d = c.date.slice(0, 10);
    days.set(d, (days.get(d) || 0) + 1);
  });
  const dates = [...days.keys()].sort();
  const min = new Date(dates[0]);
  const max = new Date(dates[dates.length - 1]);
  const out = [];
  for (let t = min.getTime(); t <= max.getTime(); t += 86400000) {
    const key = new Date(t).toISOString().slice(0, 10);
    out.push({ date: key, count: days.get(key) || 0 });
  }
  return out;
}

export function computeCoupling(commits, topN) {
  const pairCounts = new Map();
  const changeCount = new Map();
  commits.forEach(c => {
    const paths = c.filesChanged.map(f => f.path);
    paths.forEach(p => changeCount.set(p, (changeCount.get(p) || 0) + 1));
    for (let i = 0; i < paths.length; i++) {
      for (let j = i + 1; j < paths.length; j++) {
        const key = [paths[i], paths[j]].sort().join('|||');
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  });
  const pairs = [...pairCounts.entries()]
    .map(([key, count]) => { const [a, b] = key.split('|||'); return { a, b, count }; })
    .filter(p => p.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
  const nodesSet = new Set();
  pairs.forEach(p => { nodesSet.add(p.a); nodesSet.add(p.b); });
  const nodes = [...nodesSet].map(path => ({ path, changeCount: changeCount.get(path) || 0 }));
  return { pairs, nodes };
}

export function computeGrowthTrend(commits) {
  if (!commits.length) return [];
  const sorted = [...commits].sort((a, b) => new Date(a.date) - new Date(b.date));
  const weekMap = new Map();
  sorted.forEach(c => {
    const d = new Date(c.date);
    const weekStart = new Date(d);
    weekStart.setUTCDate(d.getUTCDate() - d.getUTCDay());
    const key = weekStart.toISOString().slice(0, 10);
    if (!weekMap.has(key)) weekMap.set(key, { week: key, added: 0, deleted: 0 });
    const w = weekMap.get(key);
    c.filesChanged.forEach(f => { w.added += f.additions; w.deleted += f.deletions; });
  });
  const weeks = [...weekMap.values()].sort((a, b) => a.week.localeCompare(b.week));
  let cumulative = 0;
  return weeks.map(w => { cumulative += (w.added - w.deleted); return { ...w, net: w.added - w.deleted, cumulative }; });
}

export function computeKeywords(commits) {
  const counts = new Map();
  commits.forEach(c => {
    const m = c.message.match(/^([a-z]+):/);
    const word = m ? m[1] : 'other';
    counts.set(word, (counts.get(word) || 0) + 1);
  });
  return [...counts.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count);
}

export function computeSurvival(commits) {
  const monthMap = new Map();
  commits.forEach(c => {
    const d = new Date(c.date);
    const key = d.toISOString().slice(0, 7);
    if (!monthMap.has(key)) monthMap.set(key, { month: key, added: 0 });
    c.filesChanged.forEach(f => { monthMap.get(key).added += f.additions; });
  });
  const months = [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month));
  const rng = makeRng('survival-decay');
  return months.map((m, i) => {
    const monthsAgo = months.length - 1 - i;
    const decay = Math.max(0.35, Math.pow(0.965, monthsAgo * 3) - rng() * 0.05);
    return { month: m.month, added: m.added, surviving: Math.round(m.added * decay) };
  });
}

export function generateDiff(commit, fileChange) {
  const rng = makeRng(commit.hash + '::' + fileChange.path);
  const ext = fileChange.path.split('.').pop();
  const lines = [];
  const ctxByExt = {
    ts: ['export function handle(input: Input): Result {', '  const parsed = parse(input);', '  return format(parsed);', '}'],
    tsx: ['export function Component(props: Props) {', '  const [state, setState] = useState(null);', '  return <div className="root">{state}</div>;', '}'],
    css: ['.root {', '  display: flex;', '  gap: 12px;', '}'],
    md: ['## Overview', '', '- point one', '- point two'],
    json: ['{', '  "key": "value",', '  "version": "1.2.0"', '}'],
    sql: ['ALTER TABLE orders', '  ADD COLUMN status TEXT NOT NULL DEFAULT \'pending\';'],
    yml: ['jobs:', '  build:', '    runs-on: ubuntu-latest'],
  };
  const ctx = ctxByExt[ext] || ctxByExt.ts;
  const nCtx = Math.min(2, ctx.length);
  for (let i = 0; i < nCtx; i++) lines.push({ type: 'ctx', text: ctx[i] });
  const addN = Math.min(8, Math.max(1, Math.round(fileChange.additions / 6)));
  const delN = Math.min(6, Math.max(0, Math.round(fileChange.deletions / 8)));
  for (let i = 0; i < delN; i++) lines.push({ type: 'del', text: ctx[(i + nCtx) % ctx.length] + ' // legacy' });
  for (let i = 0; i < addN; i++) lines.push({ type: 'add', text: ctx[i % ctx.length] + (i % 2 === 0 ? ' // updated' : '') });
  for (let i = nCtx; i < ctx.length; i++) lines.push({ type: 'ctx', text: ctx[i] });
  return lines;
}

// ---------- formatting ----------
export function formatDate(iso) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
export function formatDateTime(iso) {
  const d = new Date(iso);
  return `${formatDate(iso)} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
export function timeAgo(iso, now) {
  const diff = (now || new Date()) - new Date(iso);
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return `${days} 天前`;
  if (days < 365) return `${Math.floor(days / 30)} 个月前`;
  return `${Math.floor(days / 365)} 年前`;
}
export function formatNum(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}
export function truncate(s, n) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
