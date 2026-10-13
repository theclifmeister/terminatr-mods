// Pit Wall: an F1 pit wall over terminatr. Threads are cars, the user is
// the race engineer. Phase 2, the code surfaces that read:
//
//   tyres    a sidebar column: each session's context window as tyre
//            wear (soft, worn, BOX BOX), from session.state
//   order    a section under each project in the sidebar: its threads
//            in race order (finished first, then the furthest along);
//            enter on its header opens the results tab
//   laps     a details-panel section: the thread's laps (its task's
//            steps) and sectors (its PR: open, checks, merged)
//   control  a coordinator-panel section: race control (flags, the
//            inbox, merges)
//   results  a project-popup tab: the podium (done tasks, newest
//            first) and the merged pull requests
//
// Everything is published: the mod draws on view.opened and again when
// an event touches a project on show; the console keeps the cursor and
// the keys. No mod event says a thread called tm done, so the race
// order looks at its projects again each minute.
import type { TM } from "./types/tm";
declare const $: TM;

const TYRES = "tyres";
const ORDER = "order";
const LAPS = "laps";
const CONTROL = "control";
const RESULTS = "results";
// The sessions seen (by id), in the store: mod.ready's snapshot has no
// session's context, so a restart draws the cells from here.
const SESSIONS = "sessions";
// The most rows a per-project section shows (the slot's cap).
const ORDER_ROWS = 4;
const PODIUM = 3;

interface Car {
  project: string;
  thread: string;
  role: string;
  context: number;
}

let cars: Record<string, Car> = {};

// What each view shows for, as view.opened and view.closed say: the
// project for a section or tab, "project/task/thread" for the laps.
const open = new Map<string, Map<string, TM.ViewEvent>>(
  [ORDER, LAPS, CONTROL, RESULTS].map((v) => [v, new Map()]),
);

const worn = () => Number($.settings().worn) || 60;
const box = () => Number($.settings().box) || 85;

// --- tyres -----------------------------------------------------------

// compound is the tyre's wear in words: soft, worn, or BOX BOX when the
// car should pit (a fresh conversation, session.clear).
function compound(pct: number): TM.Span[] {
  if (pct >= box()) return [{ text: "BOX BOX", role: "bad" }];
  if (pct >= worn()) return [{ text: `worn ${pct}%`, role: "warn" }];
  return [{ text: `soft ${pct}%`, role: "faint" }];
}

async function saveCars(): Promise<void> {
  await $.store.set(SESSIONS, cars);
}

// --- what the views draw from ---------------------------------------

const stateLook: Record<string, TM.Span> = {
  working: { icon: "working", role: "good" },
  blocked: { icon: "blocked", role: "bad" },
  idle: { icon: "idle", role: "faint" },
  starting: { icon: "starting", role: "faint" },
  running: { icon: "running", role: "good" },
};

function stateSpan(t: TM.WatchThread): TM.Span {
  if (t.done) return { icon: "done", role: "good" };
  if (t.needs_you) return { icon: "blocked", role: "bad" };
  if (t.task?.status === "review") return { icon: "review", role: "info" };
  return stateLook[t.state ?? ""] ?? { icon: "other", role: "faint" };
}

// progress is how far a thread's task is, 0 to 1; a task without steps
// counts as half way once started.
function progress(t: TM.WatchThread): number {
  const k = t.task;
  if (!k) return 0;
  if (k.steps_total > 0) return k.steps_done / k.steps_total;
  return k.status === "started" ? 0.5 : 0;
}

// rank orders the cars: the chequered flag first, then review, then by
// progress, then by id so the order is stable.
function rank(a: TM.WatchThread, b: TM.WatchThread): number {
  const fin = (t: TM.WatchThread) => (t.done ? 0 : t.task?.status === "review" ? 1 : 2);
  return fin(a) - fin(b) || progress(b) - progress(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

const merged = (t: TM.WatchThread) => /\bmerged\b/i.test(t.pr ?? "");
const prNumber = (t: TM.WatchThread) => /#\d+/.exec(t.pr ?? "")?.[0] ?? "PR";

// --- order: a section under each project ----------------------------

function orderRow(t: TM.WatchThread, pos: number): TM.Value {
  const spans: TM.Span[] = [{ text: `P${pos} `, role: "head" }, stateSpan(t), { text: ` ${t.id}` }];
  if (t.task) {
    spans.push({ text: ` ${t.task.id}`, role: "faint" });
    if (t.task.steps_total > 0) spans.push({ text: ` ${t.task.steps_done}/${t.task.steps_total}`, role: "faint" });
  }
  return { id: t.id, spans };
}

function orderBadge(threads: TM.WatchThread[]): TM.Span[] {
  const flags = threads.filter((t) => t.needs_you).length;
  if (flags > 0) return [{ text: `${flags} `, role: "bad" }, { icon: "blocked", role: "bad" }];
  return [{ text: `${threads.length} car${threads.length === 1 ? "" : "s"}`, role: "faint" }];
}

async function drawOrder(p: TM.ProjectWatch): Promise<void> {
  const threads = [...p.threads].sort(rank);
  if (threads.length === 0) {
    await $.ui.view.set(ORDER, null, { project: p.project });
    return;
  }
  const rows = threads.slice(0, ORDER_ROWS).map((t, i) => orderRow(t, i + 1));
  await $.ui.view.set(ORDER, { kind: "list", id: "cars", rows }, { project: p.project, height: rows.length, badge: orderBadge(threads) });
}

// --- laps: a details-panel section -----------------------------------

// A kv widget's line (the widget set's Pair, which the API types don't name).
interface Pair {
  key: string;
  value: TM.Span[];
}

function sector(label: string, span: TM.Span, words: string): Pair {
  return { key: label, value: [span, { text: ` ${words}` }] };
}

// sectors are the thread's pull request as three sectors: S1 the PR
// opened, S2 its checks, S3 the merge.
function sectors(t: TM.WatchThread): TM.Widget {
  const none: TM.Span = { icon: "todo.open", role: "faint" };
  const pass: TM.Span = { icon: "ci.pass", role: "good" };
  const fail: TM.Span = { icon: "ci.fail", role: "bad" };
  const run: TM.Span = { icon: "ci.run", role: "faint" };
  const pr = t.pr ?? "";
  const pairs: Pair[] = [];
  pairs.push(pr ? sector("S1", t.pr_bad ? fail : pass, `${prNumber(t)} opened`) : sector("S1", none, "no pull request"));
  const checks = t.pr_checks ?? "";
  pairs.push(
    !pr ? sector("S2", none, "no checks")
      : checks === "pass" ? sector("S2", pass, "checks passed")
      : checks === "fail" ? sector("S2", fail, "checks failed")
      : checks === "pending" ? sector("S2", run, "checks running")
      : sector("S2", none, "no checks"),
  );
  pairs.push(merged(t) ? sector("S3", pass, "merged") : sector("S3", none, "not merged"));
  return { kind: "kv", pairs };
}

function lapsTree(t: TM.WatchThread): TM.Widget {
  const children: TM.Widget[] = [];
  const k = t.task;
  if (k && k.steps_total > 0) {
    const head: TM.Span[] = [{ text: `LAP ${k.steps_done}/${k.steps_total}`, role: "head" }];
    if (k.current) head.push({ text: `  ${k.current}`, role: "faint" });
    children.push({ kind: "text", lines: [head] });
    children.push({ kind: "progress", label: "laps", value: k.steps_done, max: k.steps_total, role: k.steps_done >= k.steps_total ? "good" : "accent" });
  } else if (k) {
    children.push({ kind: "text", lines: [[{ text: "LAP", role: "head" }, { text: `  ${k.id} has no steps`, role: "faint" }]] });
  } else {
    children.push({ kind: "text", lines: [[{ text: "LAP", role: "head" }, { text: "  no task: a free practice run", role: "faint" }]] });
  }
  children.push(sectors(t));
  const n = t.reports ?? 0;
  children.push({ kind: "text", text: n === 0 ? "radio silent: no report yet" : `radio: ${n} report${n === 1 ? "" : "s"}`, role: "faint" });
  return { kind: "stack", children };
}

// lapsOptions is what a tree for v's row is published with.
function lapsOptions(v: TM.ViewEvent): TM.ViewOptions {
  const o: TM.ViewOptions = { project: v.project, height: 6 };
  if (v.task) o.task = v.task;
  if (v.thread) o.thread = v.thread;
  return o;
}

// drawLaps publishes the laps of v's thread, or of its task's thread;
// nothing for a row without one (a project's own row).
async function drawLaps(v: TM.ViewEvent): Promise<void> {
  if (!v.project) return;
  let thread = v.thread;
  if (!thread && v.task) {
    thread = (await $.tasks.list(v.project)).find((t) => t.id === v.task)?.thread;
  }
  if (!thread) return;
  const t = await $.thread.get(v.project, thread);
  if (!t) return;
  await $.ui.view.set(LAPS, lapsTree(t), lapsOptions(v));
}

// --- control: a coordinator-panel section -----------------------------

function controlTree(p: TM.ProjectWatch): TM.Widget {
  const red = p.threads.filter((t) => t.needs_you).length;
  const yellow = p.threads.filter((t) => !t.needs_you && t.pr_checks === "fail").length;
  const flags: TM.Span[] = [];
  if (red > 0) flags.push({ icon: "blocked", role: "bad" }, { text: ` ${red} red: needs you` });
  if (yellow > 0) flags.push({ text: flags.length > 0 ? "  " : "" }, { icon: "blocked", role: "warn" }, { text: ` ${yellow} yellow: checks failing` });
  if (flags.length === 0) flags.push({ icon: "done", role: "good" }, { text: " green: all clear" });
  const needUser = p.inbox.filter((i) => i.needs_user).length;
  const inbox: TM.Span[] = p.inbox.length === 0
    ? [{ text: "empty", role: "faint" }]
    : [{ text: `${p.inbox.length} item${p.inbox.length === 1 ? "" : "s"}` }, ...(needUser > 0 ? [{ text: `, ${needUser} for you`, role: "warn" as TM.Role }] : [])];
  const done = p.threads.filter(merged).length;
  const opened = p.threads.filter((t) => t.pr && !merged(t)).length;
  const merges: TM.Span[] = [];
  if (done > 0) merges.push({ icon: "done", role: "good" }, { text: ` ${done} merged` });
  if (opened > 0) merges.push({ text: merges.length > 0 ? "  " : "" }, { text: `${opened} open`, role: "info" });
  if (merges.length === 0) merges.push({ text: "no pull request yet", role: "faint" });
  const running = p.threads.filter((t) => t.state === "working").length;
  return {
    kind: "kv",
    pairs: [
      { key: "flags", value: flags },
      { key: "inbox", value: inbox },
      { key: "merges", value: merges },
      { key: "cars", value: [{ text: `${p.threads.length} on track, ${running} on a flying lap` }] },
    ],
  };
}

async function drawControl(p: TM.ProjectWatch): Promise<void> {
  await $.ui.view.set(CONTROL, controlTree(p), { project: p.project, height: 4 });
}

// --- results: a project-popup tab ------------------------------------

function resultRow(project: string, t: TM.Task, pos: number): TM.Value {
  const spans: TM.Span[] = [{ text: pos <= PODIUM ? `P${pos} ` : "    ", role: pos === 1 ? "head" : "faint" }, { icon: "done", role: "good" }, { text: ` ${t.id} ${t.title}` }];
  if (t.updated) spans.push({ text: `  ${t.updated}`, role: "faint" });
  if (t.thread) spans.push({ text: `  ${t.thread}`, role: "faint" });
  return { id: t.id, spans, actions: [{ id: "task.show", target: { project, task: t.id } }] };
}

function resultsTree(project: string, tasks: TM.Task[], p: TM.ProjectWatch): { tree: TM.Widget; count: number } {
  const done = tasks.filter((t) => t.status === "done").sort((a, b) => ((b.updated ?? "") > (a.updated ?? "") ? 1 : (b.updated ?? "") < (a.updated ?? "") ? -1 : 0));
  const rows: TM.Value[] = [];
  if (done.length > 0) {
    rows.push({ id: "podium", head: true, spans: [{ text: "PODIUM", role: "head" }] });
    done.slice(0, PODIUM).forEach((t, i) => rows.push(resultRow(project, t, i + 1)));
  }
  if (done.length > PODIUM) {
    rows.push({ id: "classified", head: true, spans: [{ text: "CLASSIFIED", role: "head" }] });
    done.slice(PODIUM).forEach((t, i) => rows.push(resultRow(project, t, PODIUM + i + 1)));
  }
  const prs = p.threads.filter(merged);
  if (prs.length > 0) {
    rows.push({ id: "merged", head: true, spans: [{ text: "MERGED", role: "head" }] });
    for (const t of prs) rows.push({ id: t.id, spans: [{ icon: "ci.pass", role: "good" }, { text: ` ${prNumber(t)} `, role: "faint" }, { text: t.task ? `${t.task.id} ${t.task.title}` : `${t.id} ${t.title}` }] });
  }
  const tree: TM.Widget = {
    kind: "stack",
    children: [
      { kind: "list", id: "results", rows, empty: "No chequered flag yet: no task is done." },
      { kind: "text", text: "enter shows a task; a merged pull request stays listed while its thread is open.", role: "faint" },
    ],
  };
  return { tree, count: done.length };
}

async function drawResults(project: string): Promise<void> {
  const [tasks, p] = await Promise.all([$.tasks.list(project), $.project.get(project)]);
  const { tree, count } = resultsTree(project, tasks, p);
  await $.ui.view.set(RESULTS, tree, { project, count });
}

// --- publishing -------------------------------------------------------

const viewKey = (v: TM.ViewEvent) => `${v.project ?? ""}/${v.task ?? ""}/${v.thread ?? ""}`;

async function draw(v: TM.ViewEvent): Promise<void> {
  if (!v.project) return;
  switch (v.view) {
    case ORDER:
      await drawOrder(await $.project.get(v.project));
      break;
    case CONTROL:
      await drawControl(await $.project.get(v.project));
      break;
    case LAPS:
      await drawLaps(v);
      break;
    case RESULTS:
      await drawResults(v.project);
      break;
  }
}

// redraw draws the views named that show for project again, with one
// project.get for the sections that share it.
async function redraw(project: string, views: string[]): Promise<void> {
  let p: TM.ProjectWatch | undefined;
  for (const view of views) {
    const shown = open.get(view);
    if (!shown) continue;
    for (const v of shown.values()) {
      if (v.project !== project) continue;
      if (view === ORDER || view === CONTROL) {
        p ??= await $.project.get(project);
        if (view === ORDER) await drawOrder(p);
        else await drawControl(p);
      } else {
        await draw(v);
      }
    }
  }
}

const SECTIONS = [ORDER, CONTROL];
const ALL = [ORDER, CONTROL, LAPS, RESULTS];

$.on("mod.ready", async () => {
  const stored = await $.store.get(SESSIONS);
  cars = stored && typeof stored === "object" ? (stored as Record<string, Car>) : {};
});

$.on("session.state", async (e) => {
  if (!e.project) return; // a session outside the projects has no row of the mod's
  const old = cars[e.session];
  if (e.state === "exited") {
    if (!old) return;
    delete cars[e.session];
    await $.ui.cell.set(TYRES, { session: e.session }, null);
  } else {
    if (old && old.context === e.context) return;
    cars[e.session] = { project: e.project, thread: e.thread ?? "", role: e.role, context: e.context };
    await $.ui.cell.set(TYRES, { session: e.session }, compound(e.context));
  }
  await saveCars();
});

// The thresholds moved: every cell's compound may change.
$.on("mod.settings", async () => {
  await Promise.all(Object.keys(cars).map((id) => $.ui.cell.set(TYRES, { session: id }, compound(cars[id].context))));
});

$.on("view.opened", async (v) => {
  const shown = open.get(v.view);
  if (!shown || !v.project) return;
  shown.set(viewKey(v), v);
  await draw(v);
});

$.on("view.closed", async (v) => {
  const shown = open.get(v.view);
  if (!shown || !v.project) return;
  shown.delete(viewKey(v));
  // A view keeps at most 64 trees: drop the row's once it's gone.
  if (v.view === LAPS) await $.ui.view.set(LAPS, null, lapsOptions(v));
  else await $.ui.view.set(v.view, null, { project: v.project });
});

// Enter on (or a click on) the race order's header: the results tab.
$.on("ui.click", async (e) => {
  if (e.view === ORDER) await $.ui.view.open(RESULTS);
});

$.on("thread.started", (e) => redraw(e.project, SECTIONS));
$.on("thread.state", (e) => redraw(e.project, [...SECTIONS, LAPS]));
$.on("thread.resolved", (e) => redraw(e.project, ALL));
$.on("pr.changed", (e) => redraw(e.project, ALL));
$.on("inbox.item", (e) => redraw(e.project, [CONTROL]));
$.on("report.stored", (e) => redraw(e.project, [LAPS]));
$.on("tasks.changed", (e) => redraw(e.project, [ORDER, LAPS, RESULTS]));

// No event says a thread called tm done: the order and the results look
// again each minute.
$.on("clock.minute", async () => {
  const projects = new Set<string>();
  for (const view of [ORDER, RESULTS]) for (const v of open.get(view)!.values()) if (v.project) projects.add(v.project);
  for (const p of [...projects].sort()) await redraw(p, [ORDER, RESULTS]);
});
