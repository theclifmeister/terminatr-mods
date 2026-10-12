// Mainframe's JOB column: each thread's status in the sidebar, in the
// words of a JES job queue.
//
//   ABEND  its pull request's checks fail
//   HELD   it needs you, or waits on a question or a permission
//   DONE   it called tm done
//   RUN    its agent is running a turn
//   WAIT   anything else: idle, starting, or its session gone
//
// in that order, the first that holds. It draws from mod.ready's
// snapshot, then thread.state and pr.changed, and clears a thread's cell
// when the thread is resolved. No event says a thread called tm done, so
// every minute it looks at its projects again.
import type { TM } from "./types/tm";
declare const $: TM;

const COLUMN = "job";
// The targets this mod has a cell for, kept in its store so a restart
// can clear the cells of threads resolved while it wasn't running (the
// server shows the last cells again before the mod runs).
const DRAWN = "drawn";

interface Job {
  state?: string;
  needs?: string;
  checks?: string;
  done?: boolean;
}

const look: Record<string, TM.Span[]> = {
  ABEND: [{ text: "ABEND", role: "bad" }],
  HELD: [{ text: "HELD", role: "warn" }],
  DONE: [{ text: "DONE", role: "good" }],
  RUN: [{ text: "RUN", role: "head" }],
  WAIT: [{ text: "WAIT", role: "faint" }],
};

// What each thread drawn shows, by "<project>/<thread>".
const jobs = new Map<string, Job>();
const shown = new Map<string, string>();
let drawn = new Set<string>();
let saved = "";
// The projects the mod runs for, looked at again every minute.
const projects = new Set<string>();
// The cell sets a handler made, awaited together at its end.
let sets: Promise<void>[] = [];

const key = (project: string, thread: string) => `${project}/${thread}`;

function status(j: Job): string {
  if (j.checks === "fail") return "ABEND";
  if (j.needs || j.state === "blocked") return "HELD";
  if (j.done) return "DONE";
  if (j.state === "working") return "RUN";
  return "WAIT";
}

// draw sets a thread's cell when its status changed; a thread with no
// job (resolved) is cleared.
function draw(project: string, thread: string) {
  const k = key(project, thread);
  const j = jobs.get(k);
  if (!j) {
    shown.delete(k);
    if (!drawn.has(k)) return;
    drawn.delete(k);
    sets.push($.ui.cell.set(COLUMN, { project, thread }, null));
    return;
  }
  const s = status(j);
  if (shown.get(k) === s && drawn.has(k)) return;
  shown.set(k, s);
  drawn.add(k);
  sets.push($.ui.cell.set(COLUMN, { project, thread }, look[s]));
}

// done waits for the handler's cell sets and stores the targets drawn
// when they changed.
async function done() {
  const pending = sets;
  sets = [];
  await Promise.all(pending);
  const now = JSON.stringify([...drawn].sort());
  if (now !== saved) {
    saved = now;
    await $.store.set(DRAWN, [...drawn].sort());
  }
}

// paint takes the threads of the projects given as they are now; any
// target drawn before in those projects that isn't among them is
// cleared.
function paint(watches: TM.ProjectWatch[]) {
  const seen = new Set<string>();
  for (const p of watches) {
    projects.add(p.project);
    for (const t of p.threads) {
      const k = key(p.project, t.id);
      seen.add(k);
      jobs.set(k, { state: t.state, needs: t.needs_you, checks: t.pr_checks, done: t.done });
      draw(p.project, t.id);
    }
  }
  const slugs = new Set(watches.map((p) => p.project));
  for (const k of [...drawn]) {
    const [project, thread] = k.split("/");
    if (slugs.has(project) && !seen.has(k)) {
      jobs.delete(k);
      draw(project, thread);
    }
  }
}

function job(project: string, thread: string): Job {
  const k = key(project, thread);
  let j = jobs.get(k);
  if (!j) {
    j = {};
    jobs.set(k, j);
  }
  projects.add(project);
  return j;
}

$.on("mod.ready", async (e) => {
  const stored = await $.store.get(DRAWN);
  drawn = new Set(Array.isArray(stored) ? (stored as string[]) : []);
  saved = JSON.stringify([...drawn].sort());
  paint(e.projects);
  // A project no longer among the mod's keeps no cells.
  const slugs = new Set(e.projects.map((p) => p.project));
  for (const k of [...drawn]) {
    const [project, thread] = k.split("/");
    if (!slugs.has(project)) {
      jobs.delete(k);
      draw(project, thread);
    }
  }
  await done();
});

$.on("thread.started", async (e) => {
  job(e.project, e.thread);
  draw(e.project, e.thread);
  await done();
});

$.on("thread.state", async (e, meta) => {
  if (meta.dropped > 0) {
    paint([await $.project.get(e.project)]);
  } else {
    const j = job(e.project, e.thread);
    j.state = e.state;
    j.needs = e.needs_you;
    draw(e.project, e.thread);
  }
  await done();
});

$.on("pr.changed", async (e, meta) => {
  if (meta.dropped > 0) {
    // The queue dropped events: look again rather than trust the gap.
    paint([await $.project.get(e.project)]);
  } else {
    job(e.project, e.thread).checks = e.checks;
    draw(e.project, e.thread);
  }
  await done();
});

$.on("thread.resolved", async (e) => {
  jobs.delete(key(e.project, e.thread));
  draw(e.project, e.thread);
  await done();
});

$.on("clock.minute", async () => {
  for (const p of [...projects].sort()) paint([await $.project.get(p)]);
  await done();
});
