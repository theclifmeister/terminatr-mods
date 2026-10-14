# Changeset

What each thread changed in its worktree, before its pull request
exists. A sidebar column says how much, the details panel says which
files and how far each one got (uncommitted, committed but not pushed,
pushed), and a full view shows each file's diff.

```
 ● t-0001 Login   ! +120 -31        sidebar: ! work left uncommitted
 ● t-0002 Notes   ↑ +1.2k -340               ↑ commits not pushed
 ○ t-0004 Docs    ✓ +5 -0                    ✓ all pushed

 ▾ CHANGES ─────────────────────────── +120 -31
 since origin/main · 3 commits ahead · 1 unpushed
 ● 2 uncommitted  ↑ 2 unpushed  ✓ 2 pushed
 M README.md                       +3 -0 █░░░░░░░
 ? notes.txt                       +5 -0 █░░░░░░░
 internal/auth/
   A login.go                     +80 -0 ████████
   M login_test.go               +20 -22 ████░░░░
   R session.go                   +12 -9 ██░░░░░░
```

A code mod built on terminatr's mod API 1.8. terminatr reads the
worktree with git itself (`$.thread.changes`) and tells the mod when a
live thread's worktree moved (the `thread.changes` event). The mod never
runs git, never learns where a worktree is, and can't change anything:
it asks only to read your projects (`project_read`) and to draw its own
panels (`views`). No `commands` grant.

It goes further than terminatr's `changes-column` example, which shows
one `+N -M` per thread: Changeset splits the changes into layers, lists
the files and shows their diffs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//changeset
    tm mod enable changeset

Run these in a terminal of your own, not in an agent's pane. terminatr
asks you to confirm what the mod reads and draws. Needs terminatr
v0.26.0 (mod API 1.8).

## Use

**The column** (`changes`, in the sidebar and on the dashboard's thread
rows): the lines added and deleted since the thread's base, and a mark
for the newest layer they reach:

| mark | means |
|------|-------|
| `!` (warn) | uncommitted work on a thread that is idle or done: it probably forgot to commit |
| `~` | uncommitted work on a thread that is still busy (normal while it works) |
| `↑` (info) | everything is committed, but some commits aren't pushed (or the branch never was) |
| `✓` (faint, numbers too) | everything is committed and pushed: what its PR shows |

A thread with no changes, or without a repository, has an empty cell.

**The section** (`Changes`, in the details panel and beside a thread's
pane; a task's row shows its thread's): the base and the commits ahead
and unpushed, how many files are in each layer (`●` uncommitted, `↑`
unpushed, `✓` pushed), then the files as a tree: each folder, then its
files with their status (`A` added, `M` modified, `D` deleted, `R`
renamed, `T` type changed, `?` untracked) coloured by layer, `+N -M`
and a bar scaled to the largest file (green adds, red deletes). Up to 12
lines; the rest is in the diff. The header's badge is the totals. A
thread with nothing to show has no section at all.

**The diff** (a full view): **G** on the dashboard opens it on the
selected thread (prefix then G anywhere), so does enter on the section's
header, and the ≡ menu (*Changeset · diff*). It shows the thread's files
and, under them, the patch of the file under the cursor: `+` lines
green with the new line numbers, `-` lines red, hunk headers blue.
esc goes back.

| key | does |
|-----|------|
| ↑ ↓ | pick a file; its patch follows |
| tab | move between the file list and the patch, to scroll the patch |
| m | switch between **uncommitted** (against HEAD) and **since base** (what the PR will show, plus the work in progress) |
| u | hide or show untracked files |
| [ ] | the previous or next thread with changes |
| R | read the thread again |
| / | filter the list |

`tm mod run changeset open --project <slug>` can't open a view, so it
says the selected thread's changes (or every thread's) in one line.

Settings, in the mod's settings page (Mods tab):

- **default_mode** (`auto`): what the diff opens on. `auto` is
  uncommitted while the thread has some, since base otherwise.
- **show_untracked** (on): list untracked files (`u` toggles it in the
  view).
- **max_lines** (1500): diff lines shown per file; the rest is counted
  in a last line.
- **warn_idle** (on): the `!` mark for uncommitted work on an idle or
  done thread.

## When it updates

terminatr looks at a thread's worktree at most every 5 seconds while
its session is live and the mod listens, and sends `thread.changes`
when an edit, a commit or a push moved it. The column redraws from that
event alone; an open section or diff of that thread reads it again. At
the start the mod reads every thread once.

## What it can't do

- **No live updates for a thread without a session.** terminatr only
  watches live sessions. A thread whose session ended keeps its last
  numbers until it starts again, you open its section or diff, or press
  R.
- **No jump to the next hunk.** A mod can't move a list's cursor, so
  `n`/`p` for hunks aren't there: scroll the patch with tab, then the
  arrows, page keys or `/`.
- **The diff stacks below the files.** A full view lays its widgets out
  top to bottom only, so the patch can't sit beside the file list.
- **Big diffs are cut.** terminatr answers at most 256 KiB of patch per
  file, 2,000 files and 1 MiB per git output (the view says when), and
  the view shows at most `max_lines` lines per file. Binary files show
  no diff. Lines over 1,000 characters are cut, and tabs show as four
  spaces.
- **No copy, no staging, no commit.** A mod only reads; there is no
  clipboard API, and committing or pushing is the thread's job.
- **Counts, not commits.** terminatr gives the commits ahead and
  unpushed as counts, with no messages or per-commit diffs, so the view
  can't list the commits.
- **`r` is terminatr's.** Lower-case r is reserved in a view, so the
  re-read key is upper-case R.

## Develop

    tm mod dev changeset                                # run it live, restart on save
    tm mod validate changeset && tm mod test changeset  # check it, replay tests/*.json

The fixtures in `tests/` give `thread.changes` real answers (tm mod
test's fake broker answers `state: none` otherwise): a dirty idle
thread, unpushed and pushed ones, a thread without a repo, a rename, a
binary file, untracked files, a diff cut at `max_lines`, and the event
redrawing an open section.
