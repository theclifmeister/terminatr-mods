// Orbit: a radar of the projects' threads, as a full view. Each project
// is a planet; each of its threads orbits it, closer as its task nears
// done (steps done of its steps; review and done sit closest), and pulses
// while it needs the user. Under the radar, a detail line for the thread
// under the cursor, and the list of threads: up and down pick one, enter
// attaches to its session (a row binds session.attach, which the core
// runs), or shows its task when it has no session.
//
// A view is a widget tree, not a canvas: the radar is a text widget whose
// lines are spans, each a theme role (never a colour), at most 16 to a
// line. The mod lays the radar out on a grid of cells, then turns each
// line into runs of one role. Consoles poll the tree once a second, so
// the animation ticks once a second, and only while the view is open.
import type { TM } from "./types/tm";

const VIEW = "radar";
const LIST = "threads";
const TICK = 1000; // ms: consoles poll the trees every second
const MAX_SPANS = 16; // in one line of a text widget
const MIN_REGION_H = 9; // lines a planet needs for its orbits to show

// The projects as the dashboard shows them, in the order mod.ready gave.
let projects: TM.ProjectWatch[] = [];
// The open views by project: the size each console showed it at. The
// mod draws one tree for all projects, at the smallest size.
const shown = new Map<string, { width: number; height: number }>();
let selected = ""; // the row under the list's cursor: "<project>/<thread>"
let frame = 0;
let paused = false;
let timer: number | undefined;

type Role = TM.Role | "";

interface Glyphs {
  planet: string;
  ring: string;
  states: Record<string, string>;
  other: string;
  needs: [string, string]; // the pulse's two beats
  open: string;
  close: string;
}

const unicode: Glyphs = {
  planet: "(●)",
  ring: "·",
  states: { working: "●", idle: "○", starting: "◌", blocked: "▲", waiting: "▲", review: "◆", done: "✓" },
  other: "•",
  needs: ["▲", "△"],
  open: "[",
  close: "]",
};
const ascii: Glyphs = {
  planet: "(O)",
  ring: ".",
  states: { working: "*", idle: "o", starting: "o", blocked: "!", waiting: "!", review: "+", done: "v" },
  other: "*",
  needs: ["!", "?"],
  open: "[",
  close: "]",
};
const glyphs = (): Glyphs => ($.settings().glyphs === "ascii" ? ascii : unicode);
const animating = (): boolean => $.settings().animate !== false && !paused;

// How the list draws a state: an icon of the console's set, in a role.
const icons: Record<string, TM.Span> = {
  working: { icon: "working", role: "good" },
  idle: { icon: "idle", role: "faint" },
  starting: { icon: "starting", role: "faint" },
  blocked: { icon: "blocked", role: "warn" },
  waiting: { icon: "blocked", role: "warn" },
  review: { icon: "review", role: "info" },
  done: { icon: "done", role: "good" },
};
const stateRoles: Record<string, Role> = {
  working: "good",
  idle: "faint",
  starting: "faint",
  blocked: "warn",
  waiting: "warn",
  review: "info",
  done: "good",
};

// A thread's state for drawing: done and review from its task win over
// the session's state.
function stateOf(t: TM.WatchThread): string {
  if (t.done || t.task?.status === "done") return "done";
  if (t.task?.status === "review") return "review";
  return t.state ?? "idle";
}

function needsYou(p: TM.ProjectWatch, t: TM.WatchThread): boolean {
  return !!t.needs_you || (p.needs_you ?? []).some((n) => n.thread === t.id);
}

// How near done a thread is, 0 to 1.
function progress(t: TM.WatchThread): number {
  const s = stateOf(t);
  if (s === "done" || s === "review") return 1;
  const task = t.task;
  if (!task || task.steps_total <= 0) return 0;
  return Math.min(1, Math.max(0, task.steps_done / task.steps_total));
}

// A thread's short name on the radar: its task's id, else its number.
function label(t: TM.WatchThread): string {
  if (t.task?.id) return t.task.id;
  const m = /(\d+)$/.exec(t.id);
  return m ? `t${Number(m[1])}` : t.id.slice(0, 6);
}

const rowId = (project: string, thread: string) => `${project}/${thread}`;

// The grid the radar is laid out on: a glyph, a role and a priority per
// cell. A higher priority draws over a lower one.
class Grid {
  ch: string[][];
  role: Role[][];
  pri: number[][];
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.ch = Array.from({ length: h }, () => new Array(w).fill(" "));
    this.role = Array.from({ length: h }, () => new Array<Role>(w).fill(""));
    this.pri = Array.from({ length: h }, () => new Array(w).fill(0));
  }
  put(x: number, y: number, s: string, role: Role, pri: number) {
    const cs = Array.from(s);
    for (let i = 0; i < cs.length; i++) {
      const cx = x + i;
      if (cx < 0 || cx >= this.w || y < 0 || y >= this.h || this.pri[y][cx] > pri) continue;
      this.ch[y][cx] = cs[i];
      this.role[y][cx] = role;
      this.pri[y][cx] = pri;
    }
  }
  // free says whether s fits at x, y over nothing above priority pri.
  free(x: number, y: number, n: number, pri: number): boolean {
    if (y < 0 || y >= this.h || x < 0 || x + n > this.w) return false;
    for (let i = 0; i < n; i++) if (this.pri[y][x + i] >= pri) return false;
    return true;
  }
  // Each line as spans: runs of one role, a space joining any run, and
  // at most MAX_SPANS, the least important runs taking a neighbour's role.
  lines(): TM.Span[][] {
    const out: TM.Span[][] = [];
    for (let y = 0; y < this.h; y++) {
      const runs: { text: string; role: Role; pri: number }[] = [];
      for (let x = 0; x < this.w; x++) {
        const c = this.ch[y][x];
        const last = runs[runs.length - 1];
        if (last && (c === " " || this.role[y][x] === last.role)) {
          last.text += c;
          last.pri = Math.max(last.pri, c === " " ? 0 : this.pri[y][x]);
        } else if (!last && c === " ") {
          runs.push({ text: c, role: "", pri: 0 });
        } else if (last && last.text.trim() === "") {
          // Leading spaces take the role of what follows them.
          last.text += c;
          last.role = this.role[y][x];
          last.pri = this.pri[y][x];
        } else {
          runs.push({ text: c, role: this.role[y][x], pri: this.pri[y][x] });
        }
      }
      while (runs.length > MAX_SPANS) {
        let i = 0;
        for (let j = 1; j < runs.length; j++) if (runs[j].pri < runs[i].pri) i = j;
        const into = i > 0 ? i - 1 : 1;
        const [a, b] = into < i ? [into, i] : [i, into];
        runs[a] = { text: runs[a].text + runs[b].text, role: runs[into].role, pri: Math.max(runs[a].pri, runs[b].pri) };
        runs.splice(b, 1);
      }
      const spans: TM.Span[] = [];
      runs.forEach((r, i) => {
        const text = i === runs.length - 1 ? r.text.replace(/\s+$/, "") : r.text;
        if (text) spans.push(r.role ? { text, role: r.role } : { text });
      });
      out.push(spans);
    }
    return out;
  }
}

// Priorities of what the radar draws.
const P_RING = 1;
const P_LABEL = 2;
const P_PLANET = 3;
const P_THREAD = 4;
const P_NEEDS = 5;
const P_SELECTED = 6;

// Where a thread orbits: a fraction of the planet's widest orbit, from
// 1 (nothing done) to 0.35 (done), and its angle at this frame. Inner
// orbits turn faster.
function orbitOf(t: TM.WatchThread, i: number, n: number, offset: number) {
  const f = 1 - 0.65 * progress(t);
  const turn = animating() ? (frame * 0.12) / f : 0;
  return { f, a: offset + (2 * Math.PI * i) / Math.max(n, 1) + turn };
}

function drawPlanet(g: Grid, p: TM.ProjectWatch, x0: number, y0: number, w: number, h: number) {
  const gl = glyphs();
  const cx = x0 + Math.floor(w / 2);
  const cy = y0 + Math.floor((h - 1) / 2);
  // An ellipse twice as wide as tall: a cell is about twice as tall as
  // it is wide, so the orbits look round.
  const ry = Math.max(1, Math.min((h - 2) / 2, (w - 8) / 4));
  const rx = ry * 2;
  const threads = [...p.threads].sort((a, b) => (a.id < b.id ? -1 : 1));
  const offset = (hash(p.project) % 628) / 100;
  // The rings, one per distinct orbit.
  const rings = new Set(threads.map((t) => orbitOf(t, 0, 1, 0).f.toFixed(2)));
  for (const fs of rings) {
    const f = Number(fs);
    // Ramanujan's perimeter, sampled about every cell and a half, so a
    // steep side skips no line.
    const ex = rx * f;
    const ey = ry * f;
    const per = Math.PI * (3 * (ex + ey) - Math.sqrt((3 * ex + ey) * (ex + 3 * ey)));
    const n = Math.max(12, Math.round(per / 1.5));
    for (let k = 0; k < n; k++) {
      const a = (2 * Math.PI * k) / n;
      g.put(Math.round(cx + ex * Math.cos(a)), Math.round(cy + ey * Math.sin(a)), gl.ring, "faint", P_RING);
    }
  }
  // The planet, pulsing when something of the project's own waits on
  // the user (an ask about no thread).
  const own = (p.needs_you ?? []).some((n) => !n.thread);
  const planetRole: Role = own ? (animating() && frame % 2 ? "warn" : "bad") : "head";
  g.put(cx - 1, cy, gl.planet, planetRole, P_PLANET);
  const done = p.threads.filter((t) => stateOf(t) === "done").length;
  const name = `${p.project} ${done}/${p.threads.length}`;
  const ny = Math.min(y0 + h - 1, cy + Math.max(1, Math.round(ry)) + 1);
  g.put(cx - Math.floor(name.length / 2), ny, name, "head", P_PLANET);
  // The threads.
  threads.forEach((t, i) => {
    const { f, a } = orbitOf(t, i, threads.length, offset);
    const x = Math.round(cx + rx * f * Math.cos(a));
    const y = Math.round(cy + ry * f * Math.sin(a));
    const state = stateOf(t);
    const needs = needsYou(p, t);
    const sel = selected === rowId(p.project, t.id);
    let glyph = gl.states[state] ?? gl.other;
    let role: Role = stateRoles[state] ?? "faint";
    let pri = P_THREAD;
    if (needs) {
      const beat = animating() ? frame % 2 : 0;
      glyph = gl.needs[beat];
      role = beat ? "warn" : "bad";
      pri = P_NEEDS;
    }
    if (sel) {
      role = "accent";
      pri = P_SELECTED;
      g.put(x - 1, y, gl.open, role, pri);
      g.put(x + 1, y, gl.close, role, pri);
    }
    g.put(x, y, glyph, role, pri);
    // Its name beside it, where there is room: left of it on the left
    // half, so names point away from the planet.
    const text = label(t);
    const gap = sel ? 2 : 1; // the bracket, if any, and a space
    const at = x < cx ? x - gap - text.length : x + gap + 1;
    const lpri = sel ? P_SELECTED : needs ? P_NEEDS : P_LABEL;
    // The space between it and its name, clear of rings.
    const sp = x < cx ? at + text.length : x + gap;
    if (g.free(at, y, text.length, Math.max(lpri - 1, P_LABEL)) && g.free(sp, y, 1, P_LABEL)) {
      g.put(sp, y, " ", "", lpri);
      g.put(at, y, text, sel ? "accent" : needs ? "bad" : "faint", lpri);
    }
  });
}

function hash(s: string): number {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function radar(width: number, height: number): TM.Span[][] {
  const n = projects.length;
  const cols = Math.max(1, Math.min(n, Math.floor(width / 36)));
  const rows = Math.ceil(n / cols);
  const h = Math.max(height, rows * MIN_REGION_H);
  const g = new Grid(width, h);
  projects.forEach((p, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    // The last row's planets share its width.
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const w = Math.floor(width / inRow);
    const rh = Math.floor(h / rows);
    drawPlanet(g, p, c * w, r * rh, w, rh);
  });
  return g.lines();
}

// The legend: what the glyphs and the distances mean.
function legend(): TM.Span[] {
  const gl = glyphs();
  const s = gl.states;
  return [
    { text: "nearer the planet, nearer done  ", role: "faint" },
    { text: s.working, role: "good" },
    { text: " working  ", role: "faint" },
    { text: s.idle, role: "faint" },
    { text: " idle  ", role: "faint" },
    { text: s.review, role: "info" },
    { text: " review  ", role: "faint" },
    { text: s.done, role: "good" },
    { text: " done  ", role: "faint" },
    { text: gl.needs[0], role: "bad" },
    { text: " needs you", role: "faint" },
  ];
}

// The detail line: the selected thread's id, task, state, steps and
// what it waits on.
function detail(): TM.Span[] {
  for (const p of projects) {
    for (const t of p.threads) {
      if (rowId(p.project, t.id) !== selected) continue;
      const state = stateOf(t);
      const spans: TM.Span[] = [
        { text: `${p.project} · `, role: "faint" },
        { text: t.id, role: "accent" },
      ];
      if (t.task) spans.push({ text: ` ${t.task.id} ${t.task.title}` });
      spans.push({ text: ` · ${state}`, role: stateRoles[state] || "faint" });
      if (t.task && t.task.steps_total > 0) spans.push({ text: ` · ${t.task.steps_done}/${t.task.steps_total} steps`, role: "faint" });
      if (t.task?.current) spans.push({ text: ` · now: ${t.task.current}`, role: "faint" });
      const need = t.needs_you || (p.needs_you ?? []).find((n) => n.thread === t.id)?.why;
      if (need) spans.push({ text: ` · needs you: ${need}`, role: "bad" });
      return spans;
    }
  }
  return [{ text: "Pick a thread below (↑ ↓): its details show here, and enter attaches to it.", role: "faint" }];
}

function listRows(): TM.Widget[] {
  const rows: TM.Widget[] = [];
  for (const p of projects) {
    rows.push({ id: `head:${p.project}`, head: true, spans: [{ text: p.project, role: "head" }] });
    const threads = [...p.threads].sort((a, b) => {
      const na = needsYou(p, a) ? 0 : 1;
      const nb = needsYou(p, b) ? 0 : 1;
      return na - nb || (a.id < b.id ? -1 : 1);
    });
    for (const t of threads) {
      const state = stateOf(t);
      const needs = needsYou(p, t);
      const spans: TM.Span[] = [
        needs ? { icon: "blocked", role: "bad" } : (icons[state] ?? { icon: "other", role: "faint" }),
        { text: ` ${t.id}`, role: needs ? "bad" : undefined },
      ];
      if (t.task) spans.push({ text: ` ${t.task.id}`, role: "faint" }, { text: ` ${t.task.title}` });
      else if (t.title) spans.push({ text: ` ${t.title}` });
      if (t.task && t.task.steps_total > 0) spans.push({ text: `  ${t.task.steps_done}/${t.task.steps_total}`, role: "faint" });
      if (needs) spans.push({ text: "  needs you", role: "bad" });
      const actions: TM.Widget[] = [];
      if (t.session) actions.push({ id: "session.attach", target: { session: t.session } });
      else if (t.task) actions.push({ id: "task.show", target: { project: p.project, task: t.task.id } });
      rows.push({ id: rowId(p.project, t.id), spans, actions });
    }
  }
  return rows;
}

function tree(): TM.Widget {
  let width = 100;
  let height = 30;
  if (shown.size > 0) {
    width = Math.min(...[...shown.values()].map((s) => s.width));
    height = Math.min(...[...shown.values()].map((s) => s.height));
  }
  width = Math.max(20, width);
  if (projects.length === 0) {
    return { kind: "text", text: "No projects to show: Orbit draws the projects it runs for.", role: "faint" };
  }
  const count = projects.reduce((n, p) => n + p.threads.length, 0);
  // The list takes what it needs up to a third of the view; the radar
  // the rest, above it.
  const listH = Math.min(count + projects.length + 1, Math.max(4, Math.floor(height / 3)));
  const radarH = Math.max(MIN_REGION_H, height - listH - 5);
  const anim = $.settings().animate === false ? "off" : paused ? "paused" : "on";
  return {
    kind: "stack",
    children: [
      { kind: "text", id: "radar", lines: radar(width, radarH) },
      { kind: "text", id: "legend", lines: [legend()] },
      { kind: "text", id: "detail", lines: [detail()] },
      {
        kind: "list",
        id: LIST,
        rows: listRows(),
        empty: "No threads: each project's planet waits for its first.",
      },
      {
        kind: "keys",
        id: "keys",
        keys: $.settings().animate === false ? [] : [{ key: "p", label: anim === "paused" ? "resume orbits" : "pause orbits" }],
      },
    ],
  };
}

async function draw() {
  if (shown.size > 0) await $.ui.view.set(VIEW, tree());
}

// Reads the projects again, as the dashboard shows them now.
async function reload() {
  const list = await $.projects.list();
  const fresh = await Promise.all(list.map((p) => $.project.get(p.slug)));
  projects = fresh.filter((p): p is TM.ProjectWatch => !!p);
}

async function reloadOne(slug: string) {
  const p = await $.project.get(slug);
  const i = projects.findIndex((q) => q.project === slug);
  if (!p) {
    if (i >= 0) projects.splice(i, 1);
  } else if (i >= 0) projects[i] = p;
  else projects.push(p);
}

function startTimer() {
  if (timer !== undefined || !animating()) return;
  timer = setInterval(() => {
    frame++;
    draw().catch((err) => $.log("draw:", String(err)));
  }, TICK);
}

function stopTimer() {
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
}

$.on("mod.ready", (e) => {
  projects = e.projects;
});

$.on("view.opened", async (e) => {
  if (e.view !== VIEW) return;
  shown.set(e.project ?? "", { width: e.width, height: e.height });
  await reload();
  await draw();
  startTimer();
});

$.on("view.closed", (e) => {
  if (e.view !== VIEW) return;
  shown.delete(e.project ?? "");
  if (shown.size === 0) stopTimer();
});

// Something the radar shows changed: read that project again, and draw
// at once while the view is open.
async function changed(project: string | undefined) {
  if (!project || shown.size === 0) return;
  await reloadOne(project);
  await draw();
}
$.on("thread.state", (e) => changed(e.project));
$.on("thread.started", (e) => changed(e.project));
$.on("thread.resolved", (e) => changed(e.project));
$.on("task.changed", (e) => changed(e.project));
$.on("tasks.changed", (e) => changed(e.project));
$.on("session.question", (e) => changed(e.project));

$.on("ui.cursor", async (e) => {
  if (e.view !== VIEW || e.widget !== LIST) return;
  if ((e.row ?? "") === selected) return;
  selected = e.row ?? "";
  await draw();
});

$.on("ui.key", async (e) => {
  if (e.view !== VIEW || e.key !== "p") return;
  paused = !paused;
  if (paused) stopTimer();
  else startTimer();
  await draw();
});

$.on("mod.settings", async () => {
  stopTimer();
  if (shown.size > 0) startTimer();
  await draw();
});

// A safety net for what no event names: read everything each minute.
$.on("clock.minute", async () => {
  if (shown.size === 0) return;
  await reload();
  await draw();
});
