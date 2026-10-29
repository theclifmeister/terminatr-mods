// Phase view: a project's designs by double-diamond phase (Discover,
// Define, Develop, Deliver), each design's tasks folded under it (mod
// API 1.10). tm lists the designs ($.designs.list) and the tasks that
// name them ($.tasks.list: a task's design and after) and says when
// either moved (designs.changed, tasks.changed); the mod keeps no record
// of a phase and reads it again each time. Two surfaces:
//
//   phases  a project-popup tab: a head per phase, a row per design
//           (status, open questions, tasks done), its tasks folded
//           under it; o folds or unfolds the design under the cursor,
//           O all of them; enter shows the design's (or the row's) task
//   card    a dashboard card: the same phases and designs, one line
//           each, without the tasks
//
// The phase, as double-diamond's rules read it, from what tm holds:
//
//   Deliver  the design is done, or its answers hold a "Picked:" line,
//            or a Deliver: (or Build:) task names it, or tasks that name
//            no phase build it (status planned or building)
//   Develop  a Develop: (or Spike:) task names it, and nothing is picked
//   Define   anything else: recorded, its design task and no build task
//   Discover not a design: the Discover: (or Research:) tasks that name
//            no design and are not done
//
// Open questions don't move a design back to Define: they show as a
// count, warn-coloured once the design is past Define.
import type { TM } from "./types/tm";
declare const $: TM;

const TAB = "phases";
const CARD = "card";
const TABLE = "designs";

type Phase = "discover" | "define" | "develop" | "deliver";

const PHASES: { id: Phase; title: string }[] = [
  { id: "discover", title: "DISCOVER" },
  { id: "define", title: "DEFINE" },
  { id: "develop", title: "DEVELOP" },
  { id: "deliver", title: "DELIVER" },
];

// A task's phase, from the word its title starts with: the double
// diamond's templates' (Discover:, Define:, Develop:, Deliver:) or a
// plainer one (Research:, Spike:, Build:).
const KIND: [RegExp, Phase][] = [
  [/^\s*(discover|research)\b/i, "discover"],
  [/^\s*define\b/i, "define"],
  [/^\s*(develop|spike)\b/i, "develop"],
  [/^\s*(deliver|build)\b/i, "deliver"],
];

function kindOf(title: string): Phase | "" {
  for (const [re, p] of KIND) if (re.test(title)) return p;
  return "";
}

// A project's designs and tasks, as last read.
interface Data {
  designs: TM.Design[];
  tasks: Map<string, TM.Task>;
  error: string;
}

// What a project's tab unfolded: designs by name, or all but those.
interface Fold {
  all: boolean;
  flipped: Set<string>;
}

const data = new Map<string, Data>();
const tabs = new Map<string, Fold>();
const cards = new Set<string>(); // projects whose card shows ("" for all)

function picked(d: TM.Design): boolean {
  return (d.answers ?? []).some((a) => /^\s*picked\s*:/i.test(a));
}

function phaseOf(d: TM.Design, tasks: Map<string, TM.Task>): Phase {
  const kinds = new Set((d.tasks ?? []).map((id) => kindOf(tasks.get(id)?.title ?? "")));
  if (d.status === "done" || picked(d) || kinds.has("deliver")) return "deliver";
  if (kinds.has("develop")) return "develop";
  if (d.status === "planned" || d.status === "building") return "deliver";
  return "define";
}

// research are the Discover tasks that name no design and are not done.
function research(tasks: Map<string, TM.Task>): TM.Task[] {
  return [...tasks.values()].filter((t) => !t.design && t.status !== "done" && kindOf(t.title) === "discover");
}

function byPhase(d: Data): Map<Phase, TM.Design[]> {
  const out = new Map<Phase, TM.Design[]>(PHASES.map((p) => [p.id, []]));
  for (const x of d.designs) out.get(phaseOf(x, d.tasks))!.push(x);
  return out;
}

// status is a task's status cell: its icon and word, as tm's own task
// rows draw them.
function status(s: string): TM.Span[] {
  const look: Record<string, [TM.Icon, TM.Role | undefined]> = {
    started: ["working", "good"],
    blocked: ["blocked", "bad"],
    review: ["review", "warn"],
    done: ["done", "good"],
    open: ["idle", undefined],
    ready: ["idle", undefined],
  };
  const [icon, role]: [TM.Icon, TM.Role | undefined] = look[s] ?? ["other", "faint"];
  return [{ icon, role }, { text: " " + s, role }];
}

function designStatus(s: TM.DesignStatus): TM.Span[] {
  const look: Record<string, [TM.Icon, TM.Role]> = {
    designing: ["hint", "info"],
    planned: ["idle", "faint"],
    building: ["working", "good"],
    done: ["done", "good"],
  };
  const [icon, role] = look[s] ?? ["other", "faint"];
  return [{ icon, role }, { text: " " + s, role }];
}

function questions(d: TM.Design, phase: Phase): TM.Span[] {
  const n = (d.questions ?? []).length;
  if (n === 0) return [];
  return [{ text: `? ${n} open`, role: phase === "define" ? "info" : "warn" }];
}

// built is a design's build tasks done of all of them.
function built(d: TM.Design): TM.Span[] {
  const n = (d.tasks ?? []).length;
  return n > 0 ? [{ text: `${d.tasks_done}/${n} tasks`, role: "faint" }] : [];
}

// joined puts two cells' spans on one line, two spaces apart.
function joined(a: TM.Span[], b: TM.Span[]): TM.Span[] {
  return a.length > 0 && b.length > 0 ? [...a, { text: "  " }, ...b] : [...a, ...b];
}

function show(project: string, task: string | undefined): TM.Value[] {
  return task ? [{ id: "task.show", target: { project, task } }] : [];
}

// taskIds are a design's tasks, its design task first.
function taskIds(d: TM.Design): string[] {
  const ids = d.task ? [d.task] : [];
  for (const id of d.tasks ?? []) if (!ids.includes(id)) ids.push(id);
  return ids;
}

function taskRow(project: string, id: string, rowId: string, t: TM.Task | undefined, design?: TM.Design): TM.Value {
  if (!t) {
    // Named by the design but no longer on the board.
    return { id: rowId, cells: [[{ text: "  " }], [{ text: id, role: "faint" }], [{ text: "archived", role: "faint" }], [], []] };
  }
  const st = design && id === design.task && design.task_status ? design.task_status : t.status;
  const after = (t.after ?? []).length > 0 ? [{ text: "after " + t.after!.join(","), role: "faint" as TM.Role }] : [];
  return {
    id: rowId,
    cells: [[{ text: "  " }], [{ text: id, role: "faint" }, { text: " " + t.title }], status(st), after, []],
    actions: show(project, id),
  };
}

function head(id: string, title: string, n: number): TM.Value {
  return { id: "p:" + id, head: true, spans: [{ text: title, role: "head" }, { text: n > 0 ? `  ${n}` : "  none", role: "faint" }] };
}

function isOpen(f: Fold, name: string): boolean {
  return f.all !== f.flipped.has(name);
}

function tabTree(project: string, d: Data, f: Fold): TM.Widget {
  if (d.error) return { kind: "text", text: `error: ${d.error}`, role: "bad" };
  const phases = byPhase(d);
  const found = research(d.tasks);
  const rows: TM.Value[] = [];
  for (const p of PHASES) {
    if (p.id === "discover") {
      rows.push(head(p.id, p.title, found.length));
      for (const t of found) rows.push(taskRow(project, t.id, "r:" + t.id, t));
      continue;
    }
    const designs = phases.get(p.id)!;
    rows.push(head(p.id, p.title, designs.length));
    for (const x of designs) {
      const ids = taskIds(x);
      const open = isOpen(f, x.name);
      const title: TM.Span[] = [{ text: x.title || x.name }];
      if (x.title && x.title.toLowerCase() !== x.name.toLowerCase()) title.push({ text: "  " + x.name, role: "faint" });
      rows.push({
        id: "d:" + x.name,
        cells: [[{ text: ids.length === 0 ? " " : open ? "▾" : "▸", role: "faint" }], title, designStatus(x.status), questions(x, p.id), built(x)],
        actions: show(project, x.task),
      });
      if (open) for (const id of ids) rows.push(taskRow(project, id, `t:${x.name}:${id}`, d.tasks.get(id), x));
    }
  }
  const outside = [...d.tasks.values()].filter((t) => !t.design && t.status !== "done" && kindOf(t.title) !== "discover").length;
  const children: TM.Value[] = [
    {
      kind: "table",
      id: TABLE,
      empty: "no designs",
      columns: [{ title: "" }, { title: "" }, { title: "" }, { title: "" }, { title: "", right: true }],
      rows,
    },
  ];
  if (outside > 0) children.push({ kind: "text", text: `${outside} open ${outside === 1 ? "task" : "tasks"} outside the diamond (the Tasks tab lists them)`, role: "faint" });
  children.push({ kind: "keys", id: "keys", keys: [{ key: "o", label: "fold" }, { key: "O", label: f.all ? "fold all" : "unfold all" }] });
  return { kind: "stack", children };
}

// cardRows are a project's phases, one line a design; prefix names the
// project on an all-projects card.
function cardRows(project: string, d: Data, prefix: boolean): TM.Value[] {
  const name = (s: string) => (prefix ? `${project} ${s}` : s);
  const rows: TM.Value[] = [];
  if (d.error) return [{ id: project + "/error", cells: [[{ text: name(`error: ${d.error}`), role: "bad" }], [], [], []] }];
  const phases = byPhase(d);
  const max = Number($.settings().card_designs) || 4;
  for (const p of PHASES) {
    if (p.id === "discover") {
      const n = research(d.tasks).length;
      if (n > 0) rows.push({ id: `${project}/discover`, cells: [[{ text: "DISCOVER", role: "head" }], [{ text: name(n === 1 ? "1 research task" : `${n} research tasks`) }], [], []] });
      continue;
    }
    const designs = phases.get(p.id)!;
    designs.slice(0, max).forEach((x, i) => {
      rows.push({
        id: `${project}/${x.name}`,
        cells: [[{ text: i === 0 ? p.title : "", role: "head" }], [{ text: name(x.title || x.name) }], designStatus(x.status), joined(questions(x, p.id), built(x))],
        actions: show(project, x.task),
      });
    });
    if (designs.length > max) rows.push({ id: `${project}/${p.id}/more`, cells: [[], [{ text: `… ${designs.length - max} more`, role: "faint" }], [], []] });
  }
  return rows;
}

function cardTree(projects: string[], prefix: boolean): TM.Widget {
  const rows: TM.Value[] = [];
  for (const p of projects) rows.push(...cardRows(p, data.get(p)!, prefix));
  return {
    kind: "table",
    id: TABLE,
    empty: "no designs yet",
    columns: [{ title: "" }, { title: "" }, { title: "" }, { title: "", right: true }],
    rows,
  };
}

const unsupported: TM.Widget = { kind: "text", text: "Designs need terminatr v0.63.0 (mod API 1.10).", role: "warn" };

async function load(project: string): Promise<Data> {
  const d: Data = { designs: [], tasks: new Map(), error: "" };
  try {
    const [designs, tasks] = await Promise.all([$.designs.list(project), $.tasks.list(project)]);
    d.designs = designs;
    for (const t of tasks) d.tasks.set(t.id, t);
  } catch (e: any) {
    d.error = String(e?.message ?? e);
  }
  data.set(project, d);
  return d;
}

async function drawTab(project: string): Promise<void> {
  const f = tabs.get(project);
  if (!f) return;
  const tree = $.api.has("designs.list") ? tabTree(project, data.get(project) ?? (await load(project)), f) : unsupported;
  await $.ui.view.set(TAB, tree, { project });
}

async function drawCard(key: string): Promise<void> {
  if (!$.api.has("designs.list")) {
    await $.ui.view.set(CARD, unsupported, { project: key || undefined, height: 1 });
    return;
  }
  let projects = [key];
  if (key === "") {
    try {
      projects = (await $.projects.list()).map((p) => p.slug).sort();
    } catch (e: any) {
      await $.ui.view.set(CARD, { kind: "text", text: `error: ${e?.message ?? e}`, role: "bad" }, { height: 1 });
      return;
    }
  }
  for (const p of projects) if (!data.has(p)) await load(p);
  const tree = cardTree(projects, key === "");
  await $.ui.view.set(CARD, tree, { project: key || undefined, height: Math.max(1, (tree.rows as TM.Value[]).length) });
}

// refresh reads project again and redraws what shows it.
async function refresh(project: string | undefined): Promise<void> {
  if (!project || !$.api.has("designs.list")) return;
  if (!tabs.has(project) && !cards.has(project) && !cards.has("")) return;
  await load(project);
  await drawTab(project);
  if (cards.has(project)) await drawCard(project);
  if (cards.has("")) await drawCard("");
}

$.on("view.opened", async (e) => {
  if (e.view === TAB && e.project) {
    if (!tabs.has(e.project)) tabs.set(e.project, { all: false, flipped: new Set() });
    if ($.api.has("designs.list")) await load(e.project);
    await drawTab(e.project);
  } else if (e.view === CARD) {
    const key = e.project ?? "";
    cards.add(key);
    if (key && $.api.has("designs.list")) await load(key);
    await drawCard(key);
  }
});

$.on("view.closed", async (e) => {
  if (e.view === TAB && e.project) {
    tabs.delete(e.project);
    // A view keeps at most 64 trees: drop the project's once it's gone.
    await $.ui.view.set(TAB, null, { project: e.project });
  } else if (e.view === CARD) {
    cards.delete(e.project ?? "");
    await $.ui.view.set(CARD, null, { project: e.project });
  }
});

// Anything the views show changed: a design, its answers or questions,
// a build task (designs.changed); a task's title or status (tasks.changed).
$.on("designs.changed", async (e) => refresh(e.project));
$.on("tasks.changed", async (e) => refresh(e.project));

// o folds or unfolds the design under the cursor (or the design of the
// task under it); O unfolds all, or folds all once all are unfolded.
$.on("ui.key", async (e) => {
  const project = e.target?.project;
  if (e.view !== TAB || !project) return;
  const f = tabs.get(project);
  if (!f) return;
  if (e.key === "O") {
    f.all = !f.all;
    f.flipped.clear();
  } else if (e.key === "o") {
    const row = e.row ?? "";
    const name = row.startsWith("d:") ? row.slice(2) : row.startsWith("t:") ? row.slice(2, row.lastIndexOf(":")) : "";
    if (!name) return;
    if (f.flipped.has(name)) f.flipped.delete(name);
    else f.flipped.add(name);
  } else return;
  await drawTab(project);
});
