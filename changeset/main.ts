// Changeset: what each thread changed in its worktree before its pull
// request exists (mod API 1.8). tm reads the worktree with git itself
// ($.thread.changes) and says when a live thread's worktree moved (the
// thread.changes event, with the totals since its base); the mod never
// runs git and never learns where a worktree is. Three surfaces:
//
//   changes  a sidebar column: +N -M since the base, marked by the
//            newest layer: ! uncommitted work on an idle or done thread
//            (forgot to commit), ~ uncommitted, ↑ commits not pushed,
//            ✓ all pushed (faint). Nothing for a thread without changes
//   files    a details-panel section (and beside a thread's pane): the
//            commits ahead and unpushed, the files in each layer, and
//            the files as a tree with +/- bars; enter on its header
//            opens the diff
//   diff     a full view (G, the ≡ menu, or enter on the section): the
//            files, and the coloured patch of the one under the cursor;
//            m switches between uncommitted and since base, u hides the
//            untracked files, [ and ] step through the project's
//            threads with changes, R reads them again
//
// The column comes from the event alone after the start (WatchThread
// has no totals); the section and the view ask $.thread.changes for the
// files, and again when the event says their thread moved.
import type { TM } from "./types/tm";
declare const $: TM;

const COLUMN = "changes";
const FILES = "files";
const DIFF = "diff";
// The column's width in the manifest.
const CELL = 12;
// The section's most lines (its slot's cap).
const SECTION_LINES = 12;
// A diff line's most characters (a widget string's limit is 4 KiB).
const LINE_CHARS = 1000;
// The rows all lists of a tree may hold.
const MAX_ROWS = 5000;

type Mode = "uncommitted" | "base";

// What the column needs: the thread.changes event's fields.
interface Sum {
  dirty: boolean;
  ahead: number;
  unpushed: number;
  pushed: boolean;
  files: number;
  add: number;
  del: number;
}

// The diff view: whose changes, how, and the file under the cursor.
interface Diff {
  project: string;
  thread: string;
  mode: Mode;
  untracked: boolean;
  path: string;
  // The project the console opened the view for ("" for all), its
  // publish's option.
  shown: string;
  // Bumped when the patch shows another file, so its rows get new ids
  // and the console starts it at the top.
  gen: number;
}

const tkey = (project: string, thread: string) => `${project}/${thread}`;

const sums = new Map<string, Sum>();
// A thread's state (thread.state; "done" once tm done), for the ! mark.
const states = new Map<string, string>();
const titles = new Map<string, string>();
// The details sections on show, by "project/thread/task", with the
// thread each one shows.
const sections = new Map<string, { v: TM.ViewEvent; thread: string }>();
// The thread each project's details panel showed last, and the last of
// all: the one the diff opens on.
const picked = new Map<string, string>();
let lastPicked: { project: string; thread: string } | null = null;
// The thread a command or a click asked the diff to open on.
let asked: { project: string; thread: string } | null = null;
let diff: Diff | null = null;
// The file rows of the diff on show, by row id.
let rowPaths = new Map<string, string>();

const warnIdle = () => $.settings().warn_idle !== false;
const showUntracked = () => $.settings().show_untracked !== false;
const maxLines = () => Number($.settings().max_lines) || 1500;
const defaultMode = () => String($.settings().default_mode ?? "auto");

const isIdle = (state: string | undefined) => state === "idle" || state === "done";

// --- numbers ---------------------------------------------------------

// short keeps a count short: 999, 1.2k, 12k, 3m.
function short(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (n < 1000000) return `${Math.floor(n / 1000)}k`;
  return `${Math.floor(n / 1000000)}m`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// addDel is "+N -M" as good and bad spans, faint when settled.
function addDel(add: number, del: number, faint = false): TM.Span[] {
  return [
    { text: `+${short(add)}`, role: faint ? "faint" : "good" },
    { text: ` -${short(del)}`, role: faint ? "faint" : "bad" },
  ];
}

// --- the column ------------------------------------------------------

function sumOf(cs: TM.Changeset): Sum | null {
  if (cs.state === "none") return null;
  return {
    dirty: cs.state === "dirty",
    ahead: cs.ahead,
    unpushed: cs.unpushed,
    pushed: cs.pushed,
    files: cs.totals.files,
    add: cs.totals.add,
    del: cs.totals.del,
  };
}

// mark is the newest layer a thread's changes reach, in one cell.
function mark(s: Sum, state: string | undefined): TM.Span {
  if (s.dirty) return warnIdle() && isIdle(state) ? { text: "!", role: "warn" } : { text: "~", role: "faint" };
  if (s.unpushed > 0 || !s.pushed) return { text: "↑", role: "info" };
  return { text: "✓", role: "faint" };
}

// cellSpans draws a thread's totals in the column; none without changes.
function cellSpans(s: Sum | undefined, state: string | undefined): TM.Span[] | null {
  if (!s || (s.files === 0 && !s.dirty)) return null;
  const settled = !s.dirty && s.unpushed === 0 && s.pushed;
  const m = mark(s, state);
  const nums = addDel(s.add, s.del, settled);
  const len = nums.reduce((n, x) => n + (x.text ?? "").length, 0);
  // The mark takes a space after it while that fits.
  return [{ ...m, text: len + 2 <= CELL ? `${m.text} ` : m.text }, ...nums];
}

async function drawCell(project: string, thread: string): Promise<void> {
  const k = tkey(project, thread);
  await $.ui.cell.set(COLUMN, { project, thread }, cellSpans(sums.get(k), states.get(k)));
}

// --- reading changes -------------------------------------------------

// read asks tm for a thread's changes and keeps its totals for the
// column; null when tm can't say (logged).
async function read(project: string, thread: string, options?: TM.ChangesOptions): Promise<TM.Changeset | null> {
  try {
    const cs = options ? await $.thread.changes(project, thread, options) : await $.thread.changes(project, thread);
    if (!options || (options.mode ?? "base") === "base") {
      const s = sumOf(cs);
      if (s) sums.set(tkey(project, thread), s);
      else sums.delete(tkey(project, thread));
    }
    return cs;
  } catch (err) {
    $.log(`thread.changes ${project} ${thread}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// --- shared drawing --------------------------------------------------

// layers says what is uncommitted, unpushed and pushed, in files.
function layers(cs: TM.Changeset): TM.Span[] {
  const out: TM.Span[] = [];
  const b = cs.buckets;
  const sep = () => {
    if (out.length) out.push({ text: "  " });
  };
  if (b.uncommitted.files > 0) {
    sep();
    out.push({ text: "● ", role: "warn" }, { text: `${b.uncommitted.files} uncommitted` });
  }
  if (b.unpushed.files > 0) {
    sep();
    out.push({ text: "↑ ", role: "info" }, { text: `${b.unpushed.files} unpushed` });
  }
  if (b.pushed.files > 0) {
    sep();
    out.push({ text: "✓ ", role: "good" }, { text: `${b.pushed.files} pushed` });
  }
  if (!out.length) out.push({ text: "nothing changed", role: "faint" });
  return out;
}

// where says the base and the commits: "origin/main · 3 ahead · 1 unpushed".
function where(cs: TM.Changeset): TM.Span[] {
  const out: TM.Span[] = [{ text: "since ", role: "faint" }, { text: cs.base || "the base" }];
  if (cs.ahead > 0) out.push({ text: ` · ${plural(cs.ahead, "commit")} ahead`, role: "faint" });
  if (!cs.pushed && cs.ahead > 0) out.push({ text: " · never pushed", role: "info" });
  else if (cs.unpushed > 0) out.push({ text: ` · ${cs.unpushed} unpushed`, role: "info" });
  return out;
}

// The role a file's status letter takes: its newest layer.
function bucketRole(bucket: string): TM.Role {
  if (bucket === "uncommitted") return "warn";
  if (bucket === "unpushed") return "info";
  return "good";
}

// bar draws a file's +/- as blocks scaled to the largest file, at least
// one block for a side that changed.
function bar(add: number, del: number, most: number, width: number): TM.Span[] {
  if (width <= 0) return [];
  const all = add + del;
  let cells = all === 0 || most === 0 ? 0 : Math.max(1, Math.round((width * all) / most));
  if (add > 0 && del > 0) cells = Math.max(cells, 2);
  cells = Math.min(cells, width);
  let green = all === 0 ? 0 : Math.round((cells * add) / all);
  if (add > 0) green = Math.max(green, 1);
  if (del > 0) green = Math.min(green, cells - 1);
  const red = cells - green;
  const out: TM.Span[] = [];
  if (green > 0) out.push({ text: "█".repeat(green), role: "good" });
  if (red > 0) out.push({ text: "█".repeat(red), role: "bad" });
  if (width - cells > 0) out.push({ text: "░".repeat(width - cells), role: "faint" });
  return out;
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i + 1);
}

function baseOf(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

// fit cuts text to n cells, keeping its end: "…long/name.go".
function fit(text: string, n: number): string {
  if (n <= 0) return "";
  if (text.length <= n) return text;
  return n === 1 ? "…" : `…${text.slice(text.length - n + 1)}`;
}

const pad = (text: string, n: number) => (text.length >= n ? text : text + " ".repeat(n - text.length));
const padLeft = (text: string, n: number) => (text.length >= n ? text : " ".repeat(n - text.length) + text);

// byDir groups files by folder, folders in path order, root files first.
function byDir(files: TM.ChangedFile[]): [string, TM.ChangedFile[]][] {
  const groups = new Map<string, TM.ChangedFile[]>();
  for (const f of [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))) {
    const d = dirOf(f.path);
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d)!.push(f);
  }
  return [...groups.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

// --- the details section ---------------------------------------------

const sectionKey = (v: TM.ViewEvent) => `${v.project ?? ""}/${v.thread ?? ""}/${v.task ?? ""}`;

function sectionOptions(v: TM.ViewEvent, height?: number, badge?: TM.Span[]): TM.ViewOptions {
  const o: TM.ViewOptions = { project: v.project };
  if (v.task) o.task = v.task;
  if (v.thread) o.thread = v.thread;
  if (height !== undefined) o.height = height;
  if (badge) o.badge = badge;
  return o;
}

// fileLines draws the files as a tree: a folder's line, then its files
// with their status letter (in their layer's role), +/- and a bar.
function fileLines(files: TM.ChangedFile[], width: number, room: number): TM.Span[][] {
  const lines: TM.Span[][] = [];
  const most = files.reduce((m, f) => Math.max(m, f.add + f.del), 0);
  const stats = files.reduce((m, f) => Math.max(m, `+${short(f.add)} -${short(f.del)}`.length), 0);
  const barW = width >= 40 ? 8 : width >= 30 ? 4 : 0;
  const groups = byDir(files);
  let shown = 0;
  for (const [dir, group] of groups) {
    const indent = dir ? 2 : 0;
    if (dir) {
      if (lines.length >= room - 1) break;
      lines.push([{ text: fit(dir, width), role: "faint" }]);
    }
    for (const f of group) {
      if (lines.length >= room - (shown + 1 < files.length ? 1 : 0)) break;
      const nameW = Math.max(4, width - indent - 2 - stats - (barW ? barW + 1 : 0) - 1);
      const nums = f.binary ? [{ text: padLeft("bin", stats), role: "faint" as TM.Role }] : statSpans(f, stats);
      const line: TM.Span[] = indent ? [{ text: " ".repeat(indent) }] : [];
      line.push({ text: f.status || "M", role: bucketRole(f.bucket) }, { text: ` ${pad(fit(baseOf(f.path), nameW), nameW)} ` }, ...nums);
      if (barW && !f.binary) line.push({ text: " " }, ...bar(f.add, f.del, most, barW));
      lines.push(line);
      shown++;
    }
  }
  if (shown < files.length) lines.push([{ text: `… ${plural(files.length - shown, "more file")}: enter shows them all`, role: "faint" }]);
  return lines;
}

// statSpans is a file's "+N -M", right-aligned in n cells.
function statSpans(f: TM.ChangedFile, n: number): TM.Span[] {
  const text = `+${short(f.add)} -${short(f.del)}`;
  return [{ text: " ".repeat(Math.max(0, n - text.length)) }, ...addDel(f.add, f.del)];
}

function sectionTree(cs: TM.Changeset, width: number): { tree: TM.Widget; lines: number } | null {
  if (cs.state === "none" || (cs.state === "clean" && cs.totals.files === 0 && cs.ahead === 0)) return null;
  const head: TM.Span[][] = [where(cs), layers(cs)];
  const body = fileLines(cs.files, Math.max(20, width), SECTION_LINES - head.length);
  if (cs.truncated) body.push([{ text: "tm stopped reading: the list is cut", role: "faint" }]);
  const lines = [...head, ...body];
  return { tree: { kind: "text", lines }, lines: Math.min(SECTION_LINES, lines.length) };
}

// threadOf is the thread a details row shows: its own, or its task's.
async function threadOf(v: TM.ViewEvent): Promise<string> {
  if (v.thread) return v.thread;
  if (!v.task || !v.project) return "";
  try {
    return (await $.tasks.list(v.project)).find((t) => t.id === v.task)?.thread ?? "";
  } catch {
    return "";
  }
}

async function drawSection(v: TM.ViewEvent, thread: string): Promise<void> {
  if (!v.project || !thread) return;
  const cs = await read(v.project, thread);
  const drawn = cs ? sectionTree(cs, v.width) : null;
  if (!drawn || !cs) {
    await $.ui.view.set(FILES, null, sectionOptions(v));
    return;
  }
  const badge = cs.totals.files > 0 ? addDel(cs.totals.add, cs.totals.del) : [{ text: plural(cs.ahead, "commit"), role: "faint" as TM.Role }];
  await $.ui.view.set(FILES, drawn.tree, sectionOptions(v, drawn.lines, badge));
}

// --- the diff view ---------------------------------------------------

// rowId is a file row's id: a hash of its path, so the cursor stays on
// the file as the list changes (a path's slashes can't be an id).
function rowId(path: string): string {
  let h = 5381;
  for (let i = 0; i < path.length; i++) h = ((h * 33) ^ path.charCodeAt(i)) >>> 0;
  return `f${h.toString(36)}`;
}

function modeSwitch(mode: Mode): TM.Span[] {
  return [
    { text: "[ ", role: "faint" },
    { text: "uncommitted", role: mode === "uncommitted" ? "accent" : "faint" },
    { text: " | ", role: "faint" },
    { text: "since base", role: mode === "base" ? "accent" : "faint" },
    { text: " ]", role: "faint" },
  ];
}

function fileRows(files: TM.ChangedFile[]): TM.Widget {
  const rows: TM.Widget[] = [];
  rowPaths = new Map();
  const groups = byDir(files);
  const most = files.reduce((m, f) => Math.max(m, f.add + f.del), 0);
  for (const [dir, group] of groups) {
    if (dir && groups.length > 1) rows.push({ head: true, spans: [{ text: dir }] });
    for (const f of group) {
      const id = rowId(f.path);
      rowPaths.set(id, f.path);
      const name = dir && groups.length > 1 ? baseOf(f.path) : f.path;
      const spans: TM.Span[] = [
        { text: f.status || "M", role: bucketRole(f.bucket) },
        { text: ` ${name}` },
      ];
      if (f.old) spans.push({ text: ` ← ${f.old}`, role: "faint" });
      spans.push({ text: "  " });
      if (f.binary) spans.push({ text: "binary", role: "faint" });
      else spans.push(...addDel(f.add, f.del), { text: " " }, ...bar(f.add, f.del, most, 8));
      rows.push({ id, spans });
    }
  }
  return { kind: "list", id: "files", title: `FILES ${files.length}`, rows, empty: "no files" };
}

// patchRows draws a unified diff, one row a line: + good, - bad, hunks
// info, the new file's line numbers faint. Git's file header lines are
// left out (the list's title names the file).
function patchRows(patch: string, gen: number, room: number): { rows: TM.Widget[]; cut: number } {
  const rows: TM.Widget[] = [];
  const lines = patch.split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  let oldN = 0;
  let newN = 0;
  let cut = 0;
  let inHunk = false;
  for (const raw of lines) {
    if (rows.length >= room) {
      cut++;
      continue;
    }
    // A tab is a control character to the widget check: four spaces.
    const wide = raw.replace(/\t/g, "    ");
    const line = wide.length > LINE_CHARS ? `${wide.slice(0, LINE_CHARS)}…` : wide;
    const id = `p${gen}.${rows.length}`;
    if (line.startsWith("@@")) {
      const m = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
      if (m) {
        oldN = Number(m[1]);
        newN = Number(m[2]);
      }
      inHunk = true;
      rows.push({ id, spans: [{ text: "      " }, { text: line, role: "info" }] });
      continue;
    }
    if (!inHunk) {
      // diff --git, index, ---, +++: the file's own header.
      if (/^(diff --git|index |--- |\+\+\+ )/.test(line)) continue;
      rows.push({ id, spans: [{ text: "      " }, { text: line, role: "faint" }] });
      continue;
    }
    if (line.startsWith("diff --git")) {
      inHunk = false;
      continue;
    }
    if (line.startsWith("+")) {
      rows.push({ id, spans: [{ text: `${padLeft(String(newN), 5)} `, role: "faint" }, { text: line, role: "good" }] });
      newN++;
    } else if (line.startsWith("-")) {
      rows.push({ id, spans: [{ text: "      " }, { text: line, role: "bad" }] });
      oldN++;
    } else if (line.startsWith("\\")) {
      rows.push({ id, spans: [{ text: "      " }, { text: line, role: "faint" }] });
    } else {
      rows.push({ id, spans: [{ text: `${padLeft(String(newN), 5)} `, role: "faint" }, { text: line }] });
      oldN++;
      newN++;
    }
  }
  return { rows, cut };
}

function diffOptions(d: Diff): TM.ViewOptions {
  return d.shown ? { project: d.shown } : {};
}

const keysWidget: TM.Widget = {
  kind: "keys",
  id: "keys",
  keys: [
    { key: "m", label: "uncommitted / since base" },
    { key: "u", label: "untracked" },
    { key: "[", label: "previous thread" },
    { key: "]", label: "next thread" },
    { key: "R", label: "read again" },
  ],
};

async function drawDiff(): Promise<void> {
  const d = diff;
  if (!d) return;
  if (!d.project || !d.thread) {
    await $.ui.view.set(
      DIFF,
      {
        kind: "stack",
        children: [
          { kind: "text", text: "No thread picked: select a thread on the dashboard, then press G (or enter on its Changes section).", role: "faint" },
          keysWidget,
        ],
      },
      diffOptions(d),
    );
    return;
  }
  const cs = await read(d.project, d.thread, d.mode === "base" ? undefined : { mode: d.mode });
  const title = titles.get(tkey(d.project, d.thread));
  const head: TM.Span[] = [{ text: `${d.project} ${d.thread}`, role: "head" }];
  if (title) head.push({ text: ` ${title}` });
  if (cs?.branch) head.push({ text: `  ${cs.branch}`, role: "faint" });
  if (!cs || cs.state === "none") {
    await $.ui.view.set(
      DIFF,
      {
        kind: "stack",
        children: [
          { kind: "text", lines: [head] },
          { kind: "text", text: cs ? "No worktree: this thread has no repository to read, or it is gone." : "tm could not read this thread's changes (the mod's log says why).", role: "faint" },
          keysWidget,
        ],
      },
      diffOptions(d),
    );
    return;
  }
  const files = cs.files.filter((f) => d.untracked || f.status !== "?");
  const hidden = cs.files.length - files.length;
  if (!files.some((f) => f.path === d.path)) d.path = files.length ? byDir(files)[0][1][0].path : "";
  const sw = modeSwitch(d.mode);
  const total = d.mode === "base" ? cs.totals : cs.buckets.uncommitted;
  const summary: TM.Span[] = [...sw, { text: `  ${plural(total.files, "file")} ` }, ...addDel(total.add, total.del)];
  if (hidden) summary.push({ text: `  ${hidden} untracked hidden`, role: "faint" });
  if (cs.truncated) summary.push({ text: "  list cut", role: "warn" });
  const children: TM.Widget[] = [{ kind: "text", lines: [head, summary, [...where(cs), { text: "   " }, ...layers(cs)]] }, fileRows(files)];
  if (d.path) {
    const f = files.find((x) => x.path === d.path)!;
    const room = Math.min(maxLines(), MAX_ROWS - files.length - 64);
    let rows: TM.Widget[] = [];
    let note = "";
    if (f.binary) {
      note = "binary file: no text diff";
    } else {
      const one = await read(d.project, d.thread, { mode: d.mode, path: d.path, patch: true });
      const drawn = patchRows(one?.patch ?? "", d.gen, room);
      rows = drawn.rows;
      if (drawn.cut) note = `… ${plural(drawn.cut, "more line")} (the max_lines setting)`;
      else if (one?.patch_truncated) note = "… tm cut this diff at 256 KiB";
      else if (!one) note = "tm could not read this file's diff (the mod's log says why)";
    }
    if (note) rows.push({ id: `p${d.gen}.note`, spans: [{ text: "      " }, { text: note, role: "faint" }] });
    const label = f.old ? `${f.old} → ${f.path}` : f.path;
    children.push({ kind: "list", id: "patch", title: label, rows, empty: "no textual change" });
  }
  children.push(keysWidget);
  await $.ui.view.set(DIFF, { kind: "stack", children }, diffOptions(d));
}

// pick is the thread the diff opens on in project ("" for all).
function pick(project: string): { project: string; thread: string } | null {
  if (asked && (!project || asked.project === project)) {
    const a = asked;
    asked = null;
    return a;
  }
  if (project && picked.has(project)) return { project, thread: picked.get(project)! };
  if (lastPicked && (!project || lastPicked.project === project)) return lastPicked;
  // Else the project's first thread with changes.
  for (const k of [...sums.keys()].sort()) {
    const [p, t] = k.split("/");
    if (!project || p === project) return { project: p, thread: t };
  }
  return null;
}

async function openDiff(v: TM.ViewEvent): Promise<void> {
  const target = pick(v.project ?? "");
  const project = target?.project ?? v.project ?? "";
  const thread = target?.thread ?? "";
  diff = { project, thread, mode: "base", untracked: showUntracked(), path: "", shown: v.project ?? "", gen: 0 };
  if (project && thread) diff.mode = await modeFor(project, thread);
  await drawDiff();
}

// modeFor is the mode the diff opens a thread on: by the setting, and
// for auto by whether it has uncommitted work (read when the column
// hasn't heard of it).
async function modeFor(project: string, thread: string): Promise<Mode> {
  const m = defaultMode();
  if (m === "uncommitted" || m === "base") return m;
  if (!sums.has(tkey(project, thread))) await read(project, thread);
  return sums.get(tkey(project, thread))?.dirty ? "uncommitted" : "base";
}

// step moves the diff to the next (or previous) thread with changes.
async function step(by: number): Promise<void> {
  const d = diff;
  if (!d) return;
  const keys = [...sums.keys()].filter((k) => !d.shown || k.startsWith(`${d.shown}/`)).sort();
  if (!keys.length) return;
  const at = keys.indexOf(tkey(d.project, d.thread));
  const next = keys[(at + by + keys.length) % keys.length];
  const i = next.indexOf("/");
  d.project = next.slice(0, i);
  d.thread = next.slice(i + 1);
  d.path = "";
  d.gen++;
  d.mode = await modeFor(d.project, d.thread);
  await drawDiff();
}

// --- redrawing on news -----------------------------------------------

// moved redraws what shows a thread whose changes moved.
async function moved(project: string, thread: string): Promise<void> {
  for (const s of sections.values()) {
    if (s.v.project === project && s.thread === thread) await drawSection(s.v, thread);
  }
  if (diff && diff.project === project && diff.thread === thread) await drawDiff();
}

$.on("mod.ready", async (e) => {
  const reads: Promise<void>[] = [];
  for (const p of e.projects) {
    for (const t of p.threads) {
      const k = tkey(p.project, t.id);
      titles.set(k, t.title);
      states.set(k, t.done ? "done" : t.state ?? "");
      reads.push(read(p.project, t.id).then(() => drawCell(p.project, t.id)));
    }
  }
  await Promise.all(reads);
});

$.on("thread.changes", async (e) => {
  sums.set(tkey(e.project, e.thread), {
    dirty: e.dirty,
    ahead: e.ahead,
    unpushed: e.unpushed,
    pushed: e.pushed,
    files: e.files,
    add: e.add,
    del: e.del,
  });
  await drawCell(e.project, e.thread);
  await moved(e.project, e.thread);
});

$.on("thread.state", async (e) => {
  const k = tkey(e.project, e.thread);
  const was = states.get(k);
  states.set(k, e.state);
  if (sums.has(k) && isIdle(was) !== isIdle(e.state)) await drawCell(e.project, e.thread);
});

$.on("thread.started", async (e) => {
  states.set(tkey(e.project, e.thread), "starting");
});

$.on("thread.resolved", async (e) => {
  const k = tkey(e.project, e.thread);
  sums.delete(k);
  states.delete(k);
  titles.delete(k);
  if (picked.get(e.project) === e.thread) picked.delete(e.project);
  if (lastPicked && tkey(lastPicked.project, lastPicked.thread) === k) lastPicked = null;
  await $.ui.cell.set(COLUMN, { project: e.project, thread: e.thread }, null);
  for (const [sk, s] of sections) {
    if (s.v.project === e.project && s.thread === e.thread) {
      sections.delete(sk);
      await $.ui.view.set(FILES, null, sectionOptions(s.v));
    }
  }
  if (diff && diff.project === e.project && diff.thread === e.thread) await drawDiff();
});

$.on("mod.settings", async () => {
  await Promise.all(
    [...sums.keys()].map((k) => {
      const i = k.indexOf("/");
      return drawCell(k.slice(0, i), k.slice(i + 1));
    }),
  );
  if (diff) {
    diff.untracked = showUntracked();
    await drawDiff();
  }
});

$.on("view.opened", async (v) => {
  if (v.view === FILES) {
    if (!v.project) return;
    const thread = await threadOf(v);
    sections.set(sectionKey(v), { v, thread });
    if (thread) {
      picked.set(v.project, thread);
      lastPicked = { project: v.project, thread };
    }
    await drawSection(v, thread);
  } else if (v.view === DIFF) {
    await openDiff(v);
  }
});

$.on("view.closed", async (v) => {
  if (v.view === FILES) {
    if (!v.project) return;
    sections.delete(sectionKey(v));
    // A view keeps at most 64 trees: drop the row's once it's gone.
    await $.ui.view.set(FILES, null, sectionOptions(v));
  } else if (v.view === DIFF) {
    diff = null;
    rowPaths = new Map();
  }
});

// The cursor on a file shows its patch.
$.on("ui.cursor", async (e) => {
  const d = diff;
  if (!d || e.view !== DIFF || e.widget !== "files" || !e.row) return;
  const path = rowPaths.get(e.row);
  if (!path || path === d.path) return;
  d.path = path;
  d.gen++;
  await drawDiff();
});

$.on("ui.key", async (e) => {
  const d = diff;
  if (!d || e.view !== DIFF) return;
  switch (e.key) {
    case "m":
      d.mode = d.mode === "base" ? "uncommitted" : "base";
      d.gen++;
      await drawDiff();
      break;
    case "u":
      d.untracked = !d.untracked;
      await drawDiff();
      break;
    case "[":
      await step(-1);
      break;
    case "]":
      await step(1);
      break;
    case "R":
      d.gen++;
      await drawDiff();
      break;
  }
});

// Enter on (or a click on) the section's header: the diff of the thread
// that panel shows.
$.on("ui.click", async (e) => {
  if (e.view !== FILES) return;
  const project = e.target?.project ?? "";
  const thread = (project && picked.get(project)) || "";
  if (project && thread) asked = { project, thread };
  await $.ui.view.open(DIFF);
});

// G: the selected thread's diff. From tm mod run, which can't open a
// view, the thread's changes (or the project's) in one line.
$.on("command.run", async (cmd) => {
  const sel = cmd.selection;
  const project = sel?.project ?? cmd.project ?? "";
  const thread = sel?.thread ?? (project ? picked.get(project) ?? "" : "");
  asked = project && thread ? { project, thread } : null;
  try {
    await $.ui.view.open(DIFF);
  } catch {
    asked = null;
    await $.ui.toast(await oneLine(project, thread));
  }
});

// oneLine says a thread's changes, or each of a project's threads'.
async function oneLine(project: string, thread: string): Promise<string> {
  if (project && thread) {
    const cs = await read(project, thread);
    if (!cs || cs.state === "none") return `Changeset: ${project} ${thread} has no worktree to read.`;
    const b = cs.buckets;
    return `Changeset: ${project} ${thread} +${cs.totals.add} -${cs.totals.del} in ${plural(cs.totals.files, "file")} since ${cs.base || "its base"}: ${b.uncommitted.files} uncommitted, ${b.unpushed.files} unpushed, ${b.pushed.files} pushed (${plural(cs.ahead, "commit")} ahead).`;
  }
  const parts: string[] = [];
  for (const k of [...sums.keys()].sort()) {
    const i = k.indexOf("/");
    if (project && k.slice(0, i) !== project) continue;
    const s = sums.get(k)!;
    if (s.files === 0 && !s.dirty) continue;
    parts.push(`${project ? k.slice(i + 1) : k} +${s.add} -${s.del}${s.dirty ? " (uncommitted)" : ""}`);
  }
  return parts.length ? `Changeset: ${parts.join(", ")}.` : "Changeset: no thread has changes.";
}
