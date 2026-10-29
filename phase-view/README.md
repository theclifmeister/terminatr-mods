# Phase view

A project's designs grouped by double-diamond phase (Discover, Define,
Develop, Deliver), with each design's tasks folded under it, so the
project reads as problems and where each one stands, not as a task list.

```
 DISCOVER  1
    T1 Discover: who demos terminatr      ● started
 DEFINE  1
 ▸ Onboarding                             ◇ designing  ? 2 open
 DEVELOP  1
 ▾ Sync API  sync                         ● building            0/2 tasks
    T4 Define: sync API                   ✓ done
    T5 Develop: CRDT spike                ◆ review
    T6 Develop: server wins               ● started
 DELIVER  3
 ▸ Archive old threads  archive           ✓ done                1/1 tasks
 ▸ Phase view  phase-view                 ● building  ? 1 open  2/3 tasks
 ▸ search                                 ○ planned             0/1 tasks
 1 open task outside the diamond (the Tasks tab lists them)
```

A code mod built on terminatr's mod API 1.10: tm lists a project's
designs (`$.designs.list`: status, design task, tasks, answers and open
questions) and the tasks that name them (`$.tasks.list`: each task's
`design` and `after`), and says when they move (`designs.changed`,
`tasks.changed`). The mod only reads: it asks for `project_read` (reads
your projects) and `views` (draws its own panels), and keeps no phase of
its own. It goes with the [Double diamond](../double-diamond) policy
mod, whose rules name the phases this view shows, but works without it.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//phase-view
    tm mod enable phase-view

Run these in a terminal of your own, not in an agent's pane. terminatr
asks you to confirm what the mod reads and draws. Needs terminatr
v0.63.0 (mod API 1.10); on an older server it says so instead.

## Use

**The tab** (*phases*, in the project popup): a head per phase with how
many it holds, then a row per design: its title (and name, when they
differ), its status (`designing`, `planned`, `building`, `done`), its
open questions (`? 2 open`, warn-coloured once the design is past
Define) and its build tasks done of all. Each design's tasks are folded
under it: its design task first, then the tasks that name it, each with
its status and the tasks it comes `after`; a task no longer on the board
(archived) shows by id. Discover lists the research tasks that name no
design yet and aren't done. A line under the table counts the open tasks
outside the diamond (no design, no Discover title).

| key | does |
|-----|------|
| ↑ ↓ | move between phases, designs and tasks |
| o | fold or unfold the design under the cursor (on one of its tasks too) |
| O | unfold all designs; again, fold them all |
| enter | show the row's task (a design's row: its design task) |
| / | filter the rows |

**The card** (*Phases*, on the dashboard): the same phases, one line a
design with its status, open questions and tasks done, and Discover's
research tasks as one count. On the all-projects dashboard each line
names its project. enter on a line shows the design's task.

## The phases

The phase is read from what tm holds, the way the double-diamond rules
read it, first match wins:

| phase | when |
|-------|------|
| Deliver | the design is `done`, or its answers hold a `Picked:` line, or a task titled `Deliver:` (or `Build:`) names it |
| Develop | a task titled `Develop:` (or `Spike:`) names it |
| Deliver | tasks without a phase in their title build it (status `planned` or `building`): a project outside the double diamond |
| Define | anything else: the design is recorded, with its design task and no build task |
| Discover | not a design: tasks titled `Discover:` (or `Research:`) that name no design and aren't done |

Open questions don't move a design back to Define: in the double
diamond they can stay open through Develop. They show as a count, and
Double diamond's `gates` setting holds back a build while they're
open.

## Settings

`card_designs` (default 4): the designs the card lists per phase; the
rest are `… N more`.

## What it can't do

These are limits of terminatr's mod API (1.10), not things left out:

- **A task's phase comes from its title.** A task carries no template
  or kind, so `Discover:`, `Develop:` and `Deliver:` are read from the
  start of its title, as the double-diamond templates write it. A task
  renamed without its prefix moves its design by the status alone.
- **A design's phase is never recorded.** There is no `stage` field on
  a design; the view works it out each time it draws.
- **The questions are counted, not shown.** `$.designs.list` gives each
  open question's header and text but no options, and only the ones on
  the design's tasks; the view shows how many. A question raised only in
  a report's `## Needs you` isn't one tm holds.
- **No canvas.** The design's canvas (`designs/NAME.canvas`) is
  Obsidian's; the view shows its tasks as rows instead.
- **It doesn't open from a key.** A tab or card shows with its panel;
  a mod can only open a full view.

## Develop

    tm mod dev phase-view       # run it live, restart on save
    tm mod validate phase-view && tm mod test phase-view

The fixtures in `tests/` are a project with a design in each phase:
research tasks, a design still being defined, one with spikes, one with
a pick and build tasks ordered with `after`, a done one with an archived
task, and one built by plain tasks.
