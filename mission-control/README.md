# Mission control

A kanban board of every project's tasks in one terminatr full view. It
has four lanes, Ready, Started, Review and Done, and each task is a card
showing:

- `!` when it needs you (its thread asks something or waits, or the
  task is in NEEDS YOU on the dashboard)
- the project and task id
- its thread's live state: working, waiting, idle, exited or no session
- steps done out of the total
- the PR number with its CI checks (pass, fail, running); the number is
  red when the PR needs acting on
- the title

With the cursor on a card, extra lines show under it: why it needs you,
the thread and its current step, and the PR in tm's words.

A code mod. It asks for `project_read` (reads your projects) and `views`
(draws its own panels). It needs mod API 1.4 (terminatr v0.21 or later).

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//mission-control
    tm mod enable mission-control

Then open it with `M` on the dashboard (or prefix then `M` anywhere), or
from the ≡ menu: *Mission control · mission-control*. `esc` takes you back.

## Keys

| key | does |
|-----|------|
| M | (on the dashboard) open the board |
| ↑ ↓ (j k) | previous / next card in the lane |
| tab / shift+tab | next / previous lane |
| enter | attach to the card's thread session; show the task when no session runs it |
| A | accept (a task in Review) |
| x | send back (Review or Done) |
| D | delegate (a task in Ready) |
| c | open the coordinator (a blocked task) |
| / | filter the lane |
| esc | back to the dashboard |

The mod doesn't run these actions. Each card names tm's own actions;
tm shows the keys, checks the task against the live board, asks first
where it always does (accept, send back, delegate), and runs the action.
A card whose task already has a question waiting on the coordinator
offers no new one. If you have remapped these actions in a keymap mod,
your keys apply instead.

## Settings

`done_limit` (default 10): how many Done cards to show, newest first.

## What it can't do

These are limits of terminatr's mod API (1.4), not things left out:

- **Lanes stack top to bottom.** A full view stacks its widgets
  vertically and has no way to put them side by side, so the four lanes
  are bands one above the other, not columns next to each other.
- **← → don't switch lanes.** In a full view tm keeps the arrow keys
  for itself and a mod can't claim them, or `h`/`l`, to move the cursor.
  `tab` / `shift+tab` move between lanes instead.
- **enter can't both attach and show.** Both actions use `enter`, and
  a card keeps only the first action on a key. On a card with a running
  session `enter` attaches; open the task from the dashboard instead.
- **No backlog lane.** Tasks with the status `open` aren't on deck and
  are left out. Blocked tasks stay in Started, marked `!`.
- It never answers a thread's question: that is `question.answer`,
  which needs a grant of its own and isn't part of this board.

## Develop

    tm mod dev mission-control       # run it live, restart on save
    tm mod validate mission-control && tm mod test mission-control
