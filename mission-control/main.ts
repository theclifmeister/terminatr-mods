// Mission control: a kanban board of every project's tasks in one full
// view, opened from the dashboard's ≡ menu ("Mission control ·
// mission-control"); esc returns.
//
// A lane per task state, Ready, Started, Review and Done, each a table of
// cards. A card is a task with its thread's live agent state (working,
// waiting, idle), its PR and CI checks, and ! when it needs you. The
// widget set stacks widgets top to bottom, so the lanes are bands one
// above the other, not columns side by side; tab and shift+tab move
// between lanes, ↑ ↓ (or j k) between cards. ← → are the console's in a
// full view and never reach a mod.
//
// Each card names tm's own actions; the mod never runs one. enter
// attaches to the thread's session (shows the task when no session runs
// it), A accepts and x sends back a task in review, D delegates a ready
// one, c opens the coordinator about a blocked one. The keys, the check
// against the live board and the confirmation are tm's.
import type { TM } from "./types/tm";
declare const $: TM;

const VIEW = "board";

// The lanes, in order, and the task statuses each holds. blocked is a
// started task waiting on something: it stays in Started, marked as
// needing you. open (the backlog) is not on deck and has no lane.
const LANES: { id: string; title: string; statuses: string[] }[] = [
  { id: "ready", title: "READY", statuses: ["ready"] },
  { id: "started", title: "STARTED", statuses: ["started", "blocked"] },
  { id: "review", title: "REVIEW", statuses: ["review"] },
  { id: "done", title: "DONE", statuses: ["done"] },
];

interface Board {
  project: string;
  tasks: TM.Task[];
  watch: TM.ProjectWatch | null;
  error: string;
}

interface Card {
  project: string;
  task: TM.Task;
  thread?: TM.WatchThread;
  needs: string; // why it needs you, "" when it doesn't
}

// The views open, by the project their dashboard showed ("" for none).
const shown = new Set<string>();
// One refresh at a time; a change meanwhile runs one more after it.
let busy: Promise<void> | null = null;
let again = false;

function num(id: string): number {
  return Number(id.slice(1)) || 0;
}

function doneLimit(): number {
  const n = Number($.settings().done_limit);
  return Number.isFinite(n) && n >= 0 ? n : 10;
}

// cards are a project's tasks on the board, each with its thread and
// whether it needs you, as the dashboard's NEEDS YOU and thread rows
// have them.
function cards(b: Board): Card[] {
  const out: Card[] = [];
  for (const task of b.tasks) {
    const thread = b.watch?.threads.find((t) => (task.thread && t.id === task.thread) || t.task?.id === task.id);
    const need = b.watch?.needs_you.find((n) => n.task === task.id);
    let needs = thread?.needs_you ?? "";
    if (!needs && need) needs = need.why || "needs you";
    if (!needs && thread?.state === "blocked") needs = thread.reason || "waiting";
    out.push({ project: b.project, task, thread, needs });
  }
  return out;
}

// state is the thread's live agent state in the board's words: working,
// waiting (blocked on a question or a permission), idle, or exited.
function state(t?: TM.WatchThread): TM.Span[] {
  if (!t) return [];
  if (!t.session) return [{ icon: "inactive", role: "faint" }, { text: " no session", role: "faint" }];
  const look: Record<string, [TM.Icon, string, TM.Role | undefined]> = {
    working: ["working", "working", "good"],
    blocked: ["blocked", "waiting", "warn"],
    idle: ["idle", "idle", "faint"],
    exited: ["inactive", "exited", "faint"],
  };
  const [icon, word, role] = look[t.state ?? ""] ?? (["other", t.state || "unknown", "faint"] as [TM.Icon, string, TM.Role]);
  return [{ icon, role }, { text: " " + word, role }];
}

// pr is the PR's number and its checks: ✓ pass, ✗ fail, ● pending, in
// the console's icon set; bad when the PR needs acting on.
function pr(t?: TM.WatchThread): TM.Span[] {
  if (!t?.pr) return [];
  const n = /#\d+/.exec(t.pr)?.[0] ?? "PR";
  const out: TM.Span[] = [{ text: n, role: t.pr_bad ? "bad" : undefined }];
  const ci: Record<string, TM.Span> = {
    pass: { icon: "ci.pass", role: "good" },
    fail: { icon: "ci.fail", role: "bad" },
    pending: { icon: "ci.run", role: "faint" },
  };
  const c = ci[t.pr_checks ?? ""];
  if (c) out.push({ text: " " }, c);
  return out;
}

function steps(t: TM.Task): TM.Span[] {
  return t.steps_total > 0 ? [{ text: `${t.steps_done}/${t.steps_total}`, role: "faint" }] : [];
}

// actions are the core actions a card binds, the first on a key winning
// it: enter attaches to a running session, else shows the task. An ask
// (delegate, accept, send back) only while nothing already asks the
// coordinator about the task, as tm checks again at the press.
function actions(c: Card): { id: string; target: Record<string, string> }[] {
  const task = { project: c.project, task: c.task.id };
  const out: { id: string; target: Record<string, string> }[] = [];
  if (c.thread?.session) out.push({ id: "session.attach", target: { session: c.thread.session } });
  out.push({ id: "task.show", target: task });
  const ask = (id: string) => {
    if (!c.task.asked) out.push({ id, target: task });
  };
  switch (c.task.status) {
    case "review":
      ask("task.accept");
      ask("task.send-back");
      break;
    case "done":
      ask("task.send-back");
      break;
    case "blocked":
      out.push({ id: "task.coordinator", target: task });
      break;
    case "ready":
      ask("task.delegate");
      break;
  }
  return out;
}

// more are the lines under the card the cursor is on.
function more(c: Card): TM.Span[][] {
  const out: TM.Span[][] = [];
  const pad = { text: "    " };
  if (c.needs) out.push([pad, { text: "needs you: ", role: "warn" }, { text: c.needs }]);
  if (c.task.asked) out.push([pad, { text: `asked the coordinator (${c.task.asked})`, role: "warn" }]);
  if (c.thread) {
    const now = c.thread.task?.current;
    out.push([pad, { icon: "thread", role: "faint" }, { text: " " + c.thread.id, role: "faint" }, ...(now ? [{ text: "  ▸ " + now }] : [])]);
    if (c.thread.pr) out.push([pad, { text: "PR " + c.thread.pr, role: c.thread.pr_bad ? "bad" : "faint" }]);
  }
  return out;
}

const WIDTHS = { mark: 1, project: 16, task: 5, state: 12, steps: 5, pr: 7 };

function row(c: Card): TM.Value {
  const r: Record<string, TM.Value> = {
    id: `${c.project}/${c.task.id}`,
    cells: [
      c.needs ? [{ text: "!", role: "warn" }] : [],
      [{ text: c.project, role: "faint" }],
      [{ text: c.task.id, role: "accent" }],
      state(c.thread),
      steps(c.task),
      pr(c.thread),
      [{ text: c.task.title }],
    ] as TM.Value,
    actions: actions(c) as TM.Value,
  };
  const m = more(c);
  if (m.length > 0) r.more = m as TM.Value;
  return r as TM.Value;
}

// order: the cards that need you first, then by project and task; done
// ones newest first.
function order(lane: string, a: Card, b: Card): number {
  if (lane === "done") {
    return (b.task.updated ?? "").localeCompare(a.task.updated ?? "") || a.project.localeCompare(b.project) || num(b.task.id) - num(a.task.id);
  }
  return Number(!!b.needs) - Number(!!a.needs) || a.project.localeCompare(b.project) || num(a.task.id) - num(b.task.id);
}

function tree(boards: Board[]): TM.Widget {
  const all: Card[] = ([] as Card[]).concat(...boards.map(cards));
  const lanes = LANES.map((l) => ({ ...l, cards: all.filter((c) => l.statuses.includes(c.task.status)).sort((a, b) => order(l.id, a, b)) }));
  const needs = all.filter((c) => c.needs && c.task.status !== "done").length;
  const summary: TM.Span[] = [{ text: `${boards.length} project${boards.length === 1 ? "" : "s"}`, role: "faint" }];
  for (const l of lanes) summary.push({ text: "  ·  ", role: "faint" }, { text: `${l.title} ${l.cards.length}` });
  if (needs > 0) summary.push({ text: "  ·  ", role: "faint" }, { text: `${needs} need${needs === 1 ? "s" : ""} you`, role: "warn" });
  const children: TM.Value[] = [
    { kind: "text", lines: [summary, [{ text: "tab / shift+tab: next / previous lane   ↑ ↓: cards", role: "faint" }]] },
  ];
  for (const b of boards) {
    if (b.error) children.push({ kind: "text", text: `${b.project}: can't read the board: ${b.error}`, role: "bad" });
  }
  const cols = [
    { title: "", width: WIDTHS.mark },
    { title: "", width: WIDTHS.project },
    { title: "", width: WIDTHS.task },
    { title: "", width: WIDTHS.state },
    { title: "", width: WIDTHS.steps },
    { title: "", width: WIDTHS.pr },
    { title: "" },
  ];
  const limit = doneLimit();
  for (const l of lanes) {
    let cs = l.cards;
    let title = `${l.title} ${cs.length}`;
    if (l.id === "done" && cs.length > limit) {
      cs = cs.slice(0, limit);
      title += ` (the ${limit} newest)`;
    }
    children.push({ kind: "table", id: l.id, title, columns: cols, rows: cs.map(row), empty: "no tasks" });
  }
  return { kind: "stack", children };
}

async function read(project: string): Promise<Board> {
  try {
    const [tasks, watch] = await Promise.all([$.tasks.list(project), $.project.get(project)]);
    return { project, tasks, watch, error: "" };
  } catch (e: any) {
    return { project, tasks: [], watch: null, error: String(e?.message ?? e) };
  }
}

async function draw(): Promise<void> {
  let boards: Board[] = [];
  try {
    const projects = await $.projects.list();
    boards = await Promise.all(projects.map((p) => read(p.slug)));
  } catch (e: any) {
    const why = String(e?.message ?? e);
    $.log(`mission-control: ${why}`);
    await $.ui.view.set(VIEW, { kind: "text", text: `can't list the projects: ${why}`, role: "bad" });
    return;
  }
  boards.sort((a, b) => a.project.localeCompare(b.project));
  try {
    await $.ui.view.set(VIEW, tree(boards));
  } catch (e: any) {
    const why = String(e?.message ?? e);
    $.log(`mission-control: ${why}`);
    await $.ui.view.set(VIEW, { kind: "text", text: `can't draw the board: ${why}`, role: "bad" });
  }
}

// refresh draws the board again while a view shows it. One draw runs at
// a time; changes during it make one more.
async function refresh(): Promise<void> {
  if (shown.size === 0) return;
  if (busy) {
    again = true;
    return busy;
  }
  busy = (async () => {
    do {
      again = false;
      await draw();
    } while (again && shown.size > 0);
  })();
  try {
    await busy;
  } finally {
    busy = null;
  }
}

$.on("view.opened", async (e) => {
  if (e.view !== VIEW) return;
  shown.add(e.project ?? "");
  await refresh();
});

$.on("view.closed", async (e) => {
  if (e.view !== VIEW) return;
  shown.delete(e.project ?? "");
});

// What a card shows changed: a task, a thread's state, its PR.
$.on("tasks.changed", refresh);
$.on("thread.state", refresh);
$.on("thread.started", refresh);
$.on("thread.resolved", refresh);
$.on("pr.changed", refresh);
$.on("action.done", refresh);
$.on("mod.settings", refresh);
