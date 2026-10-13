// Pit Wall: an F1 pit wall over terminatr. Threads are cars, the user is
// the race engineer. The code surfaces:
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
//   calls    a dashboard card, the pit calls: the cars calling the pit
//            wall (threads and coordinators that need you); a call's
//            row binds session.attach and session.clear (a tyre
//            change), and each option of its question is a row that
//            binds question.answer
//   timing   a full view, live timing: every car of every project in
//            one classification
//   debrief  a full view, the end-of-day summary; the Debrief command
//            opens it (B on the dashboard, the ≡ menu), or says it in
//            one line for tm mod run
//   radio    a command (R): opens the pit calls card on the top call,
//            where a answers it, enter attaches and C changes tyres
//   box box  an OS notification when a car calls the pit wall, the
//            question's options as its buttons; and when its tyres
//            are gone (the context window past the box threshold)
//   hooks    toasts for the chequered flag (a merged PR) and
//            scrutineering (a task reaching review)
//
// Everything is published: the mod draws on view.opened and again when
// an event touches a project on show; the console keeps the cursor and
// the keys. The mod never acts: a bound action runs only from the
// human's key or button, through tm's own check and confirmation. No
// mod event says a thread called tm done, so the race order looks at
// its projects again each minute.
import type { TM } from "./types/tm";
declare const $: TM;

const TYRES = "tyres";
const ORDER = "order";
const LAPS = "laps";
const CONTROL = "control";
const RESULTS = "results";
const CALLS = "calls";
const TIMING = "timing";
const DEBRIEF = "debrief";
// The sessions seen (by id), in the store: mod.ready's snapshot has no
// session's context, so a restart draws the cells from here.
const SESSIONS = "sessions";
// What each car was last told to box for, in the store, so the same
// call notifies once: by "<project>/<thread>" (or "/coordinator").
const ASKED = "asked";
// The sessions told their tyres are gone, so each is told once.
const BOXED = "boxed";
const BUTTONS = 3;
// The most rows a per-project section shows (the slot's cap).
const ORDER_ROWS = 4;
const PODIUM = 3;

interface Car {
  project: string;
  thread: string;
  role: string;
  context: number;
}

// A pit call: a thread (or a coordinator, thread "") that needs you,
// with the question its session's menu asks, if one is open.
interface Call {
  project: string;
  thread: string;
  task?: string;
  why: string;
  session?: string;
  question?: TM.Ask;
}

let cars: Record<string, Car> = {};
let asked: Record<string, string> = {};
let boxed: string[] = [];
const calls = new Map<string, Call>();

// What each view shows for, as view.opened and view.closed say: the
// project for a section or tab ("" for a card or full view of all
// projects), "project/task/thread" for the laps.
const open = new Map<string, Map<string, TM.ViewEvent>>(
  [ORDER, LAPS, CONTROL, RESULTS, CALLS, TIMING, DEBRIEF].map((v) => [v, new Map()]),
);

const worn = () => Number($.settings().worn) || 60;
const box = () => Number($.settings().box) || 85;
const notifying = () => $.settings().notify !== false;

const callKey = (project: string, thread: string) => `${project}/${thread || "coordinator"}`;
const who = (project: string, thread: string) => (thread ? `${project} ${thread}` : `${project} coordinator`);

// sessionOf is the session a car runs in, from what session.state and
// the calls said; "" when the mod hasn't heard of one.
function sessionOf(project: string, thread: string): string {
  const c = calls.get(callKey(project, thread));
  if (c?.session) return c.session;
  for (const id of Object.keys(cars)) {
    const car = cars[id];
    if (car.project === project && car.thread === thread && (thread !== "" || car.role === "coordinator")) return id;
  }
  return "";
}

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

// --- calls: the pit calls card ----------------------------------------

// callRows are a call's row and, under it, one row per option of its
// question. The call's row binds session.attach (enter) and
// session.clear (C: a tyre change) on its session, or task.show on its
// task when the mod knows no session; an option's row binds
// question.answer (a) with that option. Only tm's own keys run them.
function callRows(c: Call): TM.Value[] {
  const k = callKey(c.project, c.thread);
  const session = c.session ?? sessionOf(c.project, c.thread);
  const spans: TM.Span[] = [{ icon: "blocked", role: "bad" }, { text: ` ${who(c.project, c.thread)}` }];
  if (c.task) spans.push({ text: ` ${c.task}`, role: "faint" });
  spans.push({ text: `  ${c.why}`, role: "warn" });
  const actions: TM.Value[] = session
    ? [{ id: "session.attach", target: { session } }, { id: "session.clear", target: { session } }]
    : c.task ? [{ id: "task.show", target: { project: c.project, task: c.task } }] : [];
  const rows: TM.Value[] = [{ id: k, spans, actions }];
  const q = c.question;
  if (q && session && !q.multi_select) {
    q.options.forEach((o, i) => {
      const line: TM.Span[] = [{ text: "    radio: ", role: "faint" }, { text: o.label, role: "info" }];
      if (o.description) line.push({ text: `  ${o.description}`, role: "faint" });
      rows.push({ id: `${k}#${i}`, spans: line, actions: [{ id: "question.answer", target: { session, question: q.question, option: o.label } }] });
    });
  } else if (q) {
    rows.push({ id: `${k}#menu`, spans: [{ text: "    pick the answer in the session", role: "faint" }] });
  }
  return rows;
}

// sortedCalls puts the calls with an open question first, then by car.
function sortedCalls(project: string): Call[] {
  return [...calls.values()]
    .filter((c) => project === "" || c.project === project)
    .sort((a, b) => Number(!!b.question) - Number(!!a.question) || (callKey(a.project, a.thread) < callKey(b.project, b.thread) ? -1 : 1));
}

function callsTree(project: string): { tree: TM.Widget; rows: number } {
  const rows: TM.Value[] = [];
  for (const c of sortedCalls(project)) rows.push(...callRows(c));
  return {
    rows: rows.length,
    tree: {
      kind: "stack",
      children: [
        { kind: "list", id: "calls", rows, empty: "Radio silent: no car is calling the pit wall." },
        { kind: "text", text: "enter attaches · C changes tyres (a fresh conversation; tm asks first) · a on an option answers (tm asks first)", role: "faint" },
      ],
    },
  };
}

async function drawCalls(project: string): Promise<void> {
  const { tree, rows } = callsTree(project);
  const o: TM.ViewOptions = { height: Math.min(20, Math.max(3, rows + 2)) };
  if (project) o.project = project;
  await $.ui.view.set(CALLS, tree, o);
}

async function redrawCalls(): Promise<void> {
  for (const v of open.get(CALLS)!.values()) await drawCalls(v.project ?? "");
}

// --- timing: live timing, a full view ---------------------------------

interface Entry {
  project: string;
  thread: TM.WatchThread;
}

// classification is every car of the projects given, in race order
// across projects.
function classification(ps: TM.ProjectWatch[]): Entry[] {
  const all: Entry[] = [];
  for (const p of ps) for (const t of p.threads) all.push({ project: p.project, thread: t });
  return all.sort((a, b) => rank(a.thread, b.thread) || (a.project < b.project ? -1 : a.project > b.project ? 1 : 0));
}

function tyreCell(project: string, thread: string): TM.Span[] {
  const session = sessionOf(project, thread);
  const car = session ? cars[session] : undefined;
  return car ? compound(car.context) : [{ text: "—", role: "faint" }];
}

function sectorCell(t: TM.WatchThread): TM.Span[] {
  const pr = t.pr ?? "";
  const s1: TM.Span = pr ? { icon: "ci.pass", role: t.pr_bad ? "bad" : "good" } : { icon: "todo.open", role: "faint" };
  const checks = t.pr_checks ?? "";
  const s2: TM.Span = checks === "pass" ? { icon: "ci.pass", role: "good" } : checks === "fail" ? { icon: "ci.fail", role: "bad" } : checks === "pending" ? { icon: "ci.run", role: "faint" } : { icon: "todo.open", role: "faint" };
  const s3: TM.Span = merged(t) ? { icon: "ci.pass", role: "good" } : { icon: "todo.open", role: "faint" };
  return [s1, { text: " " }, s2, { text: " " }, s3];
}

function statusCell(t: TM.WatchThread): TM.Span[] {
  if (t.done) return [{ text: "finished", role: "good" }];
  if (t.needs_you) return [{ text: t.needs_you, role: "warn" }];
  if (t.task?.status === "review") return [{ text: "scrutineering", role: "info" }];
  return [{ text: t.state ?? "", role: "faint" }];
}

function timingRow(e: Entry, pos: number): TM.Value {
  const t = e.thread;
  const session = sessionOf(e.project, t.id);
  const lap = t.task ? (t.task.steps_total > 0 ? `${t.task.steps_done}/${t.task.steps_total}` : t.task.id) : "";
  const actions: TM.Value[] = session
    ? [{ id: "session.attach", target: { session } }]
    : t.task ? [{ id: "task.show", target: { project: e.project, task: t.task.id } }] : [];
  return {
    id: `${e.project}/${t.id}`,
    cells: [
      [{ text: `P${pos}`, role: pos <= PODIUM ? "head" : "faint" }],
      [stateSpan(t), { text: ` ${t.id}` }],
      [{ text: e.project, role: "faint" }],
      tyreCell(e.project, t.id),
      [{ text: lap, role: "faint" }],
      sectorCell(t),
      statusCell(t),
    ],
    actions,
  };
}

async function timingTree(project: string): Promise<TM.Widget> {
  const slugs = project ? [project] : (await $.projects.list()).map((p) => p.slug).sort();
  const ps: TM.ProjectWatch[] = [];
  for (const slug of slugs) ps.push(await $.project.get(slug));
  const entries = classification(ps);
  const flags = entries.filter((e) => e.thread.needs_you).length;
  const head: TM.Span[] = [{ text: "LIVE TIMING", role: "head" }, { text: `  ${entries.length} car${entries.length === 1 ? "" : "s"} · ${slugs.length} project${slugs.length === 1 ? "" : "s"}`, role: "faint" }];
  if (flags > 0) head.push({ text: "  " }, { icon: "blocked", role: "bad" }, { text: ` ${flags} calling`, role: "bad" });
  return {
    kind: "stack",
    children: [
      { kind: "text", lines: [head] },
      {
        kind: "table",
        id: "cars",
        columns: [{ title: "POS" }, { title: "CAR" }, { title: "PROJECT" }, { title: "TYRES" }, { title: "LAP", right: true }, { title: "S1 S2 S3" }, { title: "STATUS" }],
        rows: entries.map((e, i) => timingRow(e, i + 1)),
        empty: "No car on track.",
      },
      { kind: "text", text: "enter attaches to the car (shows its task when its session is unknown) · esc returns", role: "faint" },
    ],
  };
}

async function drawTiming(project: string): Promise<void> {
  await $.ui.view.set(TIMING, await timingTree(project), project ? { project } : {});
}

// --- debrief: the end of the day --------------------------------------

interface Day {
  project: string;
  done: TM.Task[];
  merged: TM.WatchThread[];
  flags: number;
  cars: number;
  reports: number;
}

// today is the date part of an RFC 3339 time, as a task's updated is.
const today = (time: string) => time.slice(0, 10);

async function day(slug: string, date: string): Promise<Day> {
  const [p, tasks] = await Promise.all([$.project.get(slug), $.tasks.list(slug)]);
  return {
    project: slug,
    done: tasks.filter((t) => t.status === "done" && (t.updated ?? "") === date),
    merged: p.threads.filter(merged),
    flags: p.threads.filter((t) => t.needs_you).length,
    cars: p.threads.length,
    reports: p.threads.reduce((n, t) => n + (t.reports ?? 0), 0),
  };
}

async function days(project: string, date: string): Promise<Day[]> {
  const slugs = project ? [project] : (await $.projects.list()).map((p) => p.slug).sort();
  const out: Day[] = [];
  for (const slug of slugs) out.push(await day(slug, date));
  return out;
}

// summary is the debrief in one line: the toast for tm mod run.
function summary(ds: Day[]): string {
  const done = ds.reduce((n, d) => n + d.done.length, 0);
  const merges = ds.reduce((n, d) => n + d.merged.length, 0);
  const flags = ds.reduce((n, d) => n + d.flags, 0);
  const cars = ds.reduce((n, d) => n + d.cars, 0);
  const where = ds.length === 1 ? ds[0].project : `${ds.length} projects`;
  return `Debrief, ${where}: ${done} done today · ${merges} merged · ${flags} calling · ${cars} on track`;
}

function debriefTree(ds: Day[], date: string): TM.Widget {
  const children: TM.Widget[] = [{ kind: "text", lines: [[{ text: `DEBRIEF ${date}`, role: "head" }, { text: "  " + summary(ds).replace(/^Debrief, [^:]*: /, ""), role: "faint" }]] }];
  for (const d of ds) {
    children.push({ kind: "text", text: d.project, role: "accent" });
    const pairs: Pair[] = [
      { key: "done", value: d.done.length === 0 ? [{ text: "none today", role: "faint" }] : d.done.map((t): TM.Span => ({ text: `${t.id} `, role: "good" })) },
      { key: "merged", value: d.merged.length === 0 ? [{ text: "none open", role: "faint" }] : d.merged.map((t): TM.Span => ({ text: `${prNumber(t)} `, role: "good" })) },
      { key: "flags", value: d.flags === 0 ? [{ icon: "done", role: "good" }, { text: " all clear" }] : [{ icon: "blocked", role: "bad" }, { text: ` ${d.flags} calling` }] },
      { key: "cars", value: [{ text: `${d.cars} on track, ${d.reports} radio message${d.reports === 1 ? "" : "s"}` }] },
    ];
    children.push({ kind: "kv", pairs });
    if (d.done.length > 0) {
      children.push({ kind: "list", id: `done-${d.project}`, rows: d.done.map((t) => ({ id: t.id, spans: [{ icon: "done", role: "good" as TM.Role }, { text: ` ${t.id} ${t.title}` }], actions: [{ id: "task.show", target: { project: d.project, task: t.id } }] })) });
    }
  }
  children.push({ kind: "text", text: "enter shows a task · esc returns", role: "faint" });
  return { kind: "stack", children };
}

async function drawDebrief(project: string, date: string): Promise<void> {
  await $.ui.view.set(DEBRIEF, debriefTree(await days(project, date), date), project ? { project } : {});
}

// --- box box: notifications -------------------------------------------

async function notify(n: TM.Notification): Promise<void> {
  try {
    await $.ui.notify(n);
  } catch (err) {
    // Over the rate (6 a minute), the grant taken back, or the menu
    // gone already: the card still shows it all.
    $.log(`not notified: ${(err as Error).message}`);
  }
}

// tell records text as what key was told to box for; false when it
// already was, so it isn't told again.
async function tell(key: string, text: string): Promise<boolean> {
  if ((asked[key] ?? "") === text) return false;
  if (text) asked[key] = text;
  else delete asked[key];
  await $.store.set(ASKED, asked);
  return text !== "";
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

// drawAll draws a card or full view for the project it shows ("" for
// all), with the time for the debrief.
async function drawAll(v: TM.ViewEvent, time: string): Promise<void> {
  switch (v.view) {
    case CALLS:
      await drawCalls(v.project ?? "");
      break;
    case TIMING:
      await drawTiming(v.project ?? "");
      break;
    case DEBRIEF:
      await drawDebrief(v.project ?? "", today(time));
      break;
  }
}

// redraw draws the views named that show for project again, with one
// project.get for the sections that share it; the live timing of all
// projects follows every project.
async function redraw(project: string, views: string[], time = ""): Promise<void> {
  let p: TM.ProjectWatch | undefined;
  for (const view of views) {
    const shown = open.get(view);
    if (!shown) continue;
    for (const v of shown.values()) {
      const all = view === TIMING || view === DEBRIEF;
      if (v.project !== project && !(all && !v.project)) continue;
      if (view === ORDER || view === CONTROL) {
        p ??= await $.project.get(project);
        if (view === ORDER) await drawOrder(p);
        else await drawControl(p);
      } else if (all) {
        await drawAll(v, time);
      } else {
        await draw(v);
      }
    }
  }
}

const SECTIONS = [ORDER, CONTROL];
const ALL = [ORDER, CONTROL, LAPS, RESULTS, TIMING];

$.on("mod.ready", async (e) => {
  const stored = await $.store.get(SESSIONS);
  cars = stored && typeof stored === "object" ? (stored as Record<string, Car>) : {};
  const told = await $.store.get(ASKED);
  asked = told && typeof told === "object" ? (told as Record<string, string>) : {};
  const b = await $.store.get(BOXED);
  boxed = Array.isArray(b) ? (b as string[]) : [];
  // The cars calling now were calling before the mod started: they
  // are pit calls, but not news.
  for (const p of e.projects) {
    for (const t of p.threads) {
      if (!t.needs_you) continue;
      const need = p.needs_you.find((n) => n.thread === t.id);
      calls.set(callKey(p.project, t.id), { project: p.project, thread: t.id, task: t.task?.id, why: t.needs_you, session: need?.session });
      asked[callKey(p.project, t.id)] = t.needs_you;
    }
  }
  await $.store.set(ASKED, asked);
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
    // Tyres gone: once per session. No session action can be a
    // button, so the card's C (session.clear) is the tyre change.
    if (e.context >= box() && !boxed.includes(e.session) && notifying()) {
      boxed.push(e.session);
      await $.store.set(BOXED, boxed);
      await notify({ title: `BOX BOX ${e.thread ?? "coordinator"}`, text: `${e.project}: tyres gone, ${e.context}% of the context window used. C on its pit call changes them.`, level: "warn" });
    } else if (e.context < worn() && boxed.includes(e.session)) {
      boxed = boxed.filter((id) => id !== e.session);
      await $.store.set(BOXED, boxed);
    }
  }
  await saveCars();
  await redraw(e.project, [TIMING]);
});

// The thresholds moved: every cell's compound may change.
$.on("mod.settings", async () => {
  await Promise.all(Object.keys(cars).map((id) => $.ui.cell.set(TYRES, { session: id }, compound(cars[id].context))));
});

const wide = (view: string) => view === CALLS || view === TIMING || view === DEBRIEF;

$.on("view.opened", async (v, meta) => {
  const shown = open.get(v.view);
  if (!shown) return;
  if (wide(v.view)) {
    shown.set(v.project ?? "", v);
    await drawAll(v, meta.time);
    return;
  }
  if (!v.project) return;
  shown.set(viewKey(v), v);
  await draw(v);
});

$.on("view.closed", async (v) => {
  const shown = open.get(v.view);
  if (!shown) return;
  if (wide(v.view)) {
    shown.delete(v.project ?? "");
    return;
  }
  if (!v.project) return;
  shown.delete(viewKey(v));
  // A view keeps at most 64 trees: drop the row's once it's gone.
  if (v.view === LAPS) await $.ui.view.set(LAPS, null, lapsOptions(v));
  else await $.ui.view.set(v.view, null, { project: v.project });
});

// --- the pit calls, and what tells the engineer ------------------------

// call records that a car calls the pit wall (why ""; gone), draws the
// card again and, when it is news, sends the box-box notification.
async function call(c: Call, buttons: TM.NotifyButton[]): Promise<void> {
  const k = callKey(c.project, c.thread);
  if (!c.why) {
    const was = calls.get(k);
    if (was?.question && !c.question) {
      // The menu closed, but the thread may still need you.
      was.question = undefined;
    } else {
      calls.delete(k);
    }
  } else {
    const was = calls.get(k);
    calls.set(k, { ...was, ...c, session: c.session ?? was?.session, question: c.question ?? (c.question === undefined ? was?.question : undefined) });
  }
  await redrawCalls();
  if (!(await tell(k, c.why)) || !notifying()) return;
  await notify({ title: `BOX BOX ${c.thread || "coordinator"}`, text: `${c.project}: ${c.why}`, level: "warn", actions: buttons });
}

// A question menu opened on a car's (or a coordinator's) session: its
// options are the card's radio rows and the notification's buttons (at
// most three), each the core's own answer, after its confirmation.
$.on("session.question", async (e) => {
  const q = e.question;
  const thread = e.thread ?? "";
  if (!q) {
    await call({ project: e.project, thread, why: "", session: e.session }, []);
    return;
  }
  const options = q.multi_select ? [] : q.options.slice(0, BUTTONS);
  const more = q.multi_select ? " (pick them in the session)" : q.options.length > BUTTONS ? " (more on the card)" : "";
  await call(
    { project: e.project, thread, why: q.question + more, session: e.session, question: q },
    options.map((o) => ({ id: "question.answer", target: { session: e.session, question: q.question, option: o.label } })),
  );
});

// A thread's status needs you (or stops needing you). A question's
// menu came as session.question already and is told once.
$.on("thread.state", async (e) => {
  const buttons: TM.NotifyButton[] = e.task ? [{ id: "task.show", target: { project: e.project, task: e.task } }] : [];
  await call({ project: e.project, thread: e.thread, task: e.task, why: e.needs_you ?? "" }, buttons);
  await redraw(e.project, [...SECTIONS, LAPS, TIMING]);
});

$.on("thread.resolved", async (e) => {
  const k = callKey(e.project, e.thread);
  calls.delete(k);
  if (k in asked) {
    delete asked[k];
    await $.store.set(ASKED, asked);
  }
  await redrawCalls();
  await redraw(e.project, ALL);
});

// Hooks: the chequered flag when a pull request is merged, and
// scrutineering when a task reaches review.
$.on("pr.changed", async (e) => {
  if (e.state.toUpperCase() === "MERGED") await $.ui.toast(`Chequered flag: ${e.project} ${e.thread} #${e.number} merged`);
  await redraw(e.project, ALL);
});

$.on("task.changed", async (e) => {
  if (e.to === "review" && e.from !== "review") await $.ui.toast(`Scrutineering: ${e.project} ${e.id} ${e.title} is in review`);
});

// The commands: R the radio (the pit calls card, on the top call), L
// live timing, B the debrief. From a console each opens its view; from
// tm mod run, which can't, the radio and the debrief say it in one line
// as a toast, and live timing says where to find it.
$.on("command.run", async (cmd, meta) => {
  const project = cmd.project ?? "";
  if (cmd.command === "radio") {
    try {
      await $.ui.view.open(CALLS);
    } catch {
      const top = sortedCalls(project)[0];
      const text = top
        ? `Radio: ${who(top.project, top.thread)} calls: ${top.why}${top.question && !top.question.multi_select ? ` (${top.question.options.map((o) => o.label).join(" / ")})` : ""}`
        : "Radio silent: no car is calling the pit wall.";
      await $.ui.toast(text, top ? "warn" : "info");
    }
  } else if (cmd.command === "timing") {
    try {
      await $.ui.view.open(TIMING);
    } catch {
      await $.ui.toast("Live timing is a view: open it with L on the dashboard or from the ≡ menu.", "info");
    }
  } else if (cmd.command === "debrief") {
    try {
      await $.ui.view.open(DEBRIEF);
    } catch {
      await $.ui.toast(summary(await days(project, today(meta.time))));
    }
  }
});

// Enter on (or a click on) the race order's header: the results tab.
$.on("ui.click", async (e) => {
  if (e.view === ORDER) await $.ui.view.open(RESULTS);
});

$.on("thread.started", (e) => redraw(e.project, [...SECTIONS, TIMING]));
$.on("inbox.item", (e) => redraw(e.project, [CONTROL]));
$.on("report.stored", (e) => redraw(e.project, [LAPS]));
$.on("tasks.changed", (e, meta) => redraw(e.project, [ORDER, LAPS, RESULTS, DEBRIEF], meta.time));

// No event says a thread called tm done: the order, the results and
// the timing look again each minute.
$.on("clock.minute", async (e) => {
  const projects = new Set<string>();
  for (const view of [ORDER, RESULTS, TIMING, DEBRIEF]) for (const v of open.get(view)!.values()) if (v.project) projects.add(v.project);
  for (const p of [...projects].sort()) await redraw(p, [ORDER, RESULTS, TIMING, DEBRIEF], e.now);
  for (const view of [TIMING, DEBRIEF]) {
    const v = open.get(view)!.get("");
    if (v) await drawAll(v, e.now);
  }
});
