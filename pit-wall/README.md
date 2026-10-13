# Pit Wall

An F1 pit wall for terminatr: threads are cars, you are the race
engineer. One mod, every surface tm offers, in one concept. The data
files:

- **a theme**: carbon and papaya. Light grey text on carbon on a dark
  terminal, papaya (`#ff8000`) for headings, the accent and the
  selection, and the marshals' flags for the states (red bad, yellow
  warn, green good, blue info); the same livery on a warm white on a
  light terminal, with a deeper papaya that reads on white. The panes
  take the same colours, background included.
- **an icon set**: tyres and flags. A car's state is its tyre (`◉`
  turning, `○` at rest, `◌` being fitted, `◈` under scrutineering), a
  stop is a flag (`⚑`), and done is the chequered flag (`▚`), for
  threads, checks and steps alike.
- **a layout**: the timing tower on the left (28% of the window, its
  columns in a timing screen's order: state, flag, sector, laps, tyres),
  the telemetry along the bottom (the details panel, 35% of the height),
  and the pit calls (mods' cards) before the sessions outside projects.
- **a keymap**: the function keys. F1 is help; F2 and F3 jump the timing
  tower to the next and previous car calling the pit wall; F4 toggles
  the telemetry; F5 slims the timing tower. The built-in keys stay.

And the code, on as soon as the mod is:

- **a tyre-wear column** (`tyres`): each session's context window in the
  sidebar and on the dashboard's thread rows: `soft 42%`, `worn 71%`
  (from 60%) or `BOX BOX` (from 85%: time for a fresh conversation).
  Both thresholds are settings.
- **the race order**, a section under each project in the sidebar: its
  threads as P1, P2, …: the chequered flag first (`tm done`), then
  review, then by how far the task's steps are; the badge counts the
  red flags (threads that need you), else the cars. Enter on its header
  opens the race results.
- **the lap chart**, a section of the details panel (and beside a
  thread's pane): the thread's laps (its task's steps, with a progress
  bar) and its three sectors (S1 the pull request opened, S2 its
  checks, S3 the merge), and its radio (reports). A task's row shows
  its thread's; a project's row shows nothing.
- **race control**, a section of the coordinator's panel, right after
  NEEDS YOU: the flags (red: threads that need you; yellow: checks
  failing; green: all clear), the inbox, the merges and the cars.
- **race results**, a tab of the project popup: the podium (the three
  done tasks finished last) and the classified rest, enter showing a
  task, then the merged pull requests of threads still open. The tab's
  count is the done tasks.

- **the pit calls**, a dashboard card: the cars calling the pit wall
  (threads and coordinators that need you), questions first. A call's
  row binds tm's own actions: enter attaches, `C` changes tyres (a
  fresh conversation, `session.clear`; tm asks first). Under a question
  each option is a radio row: `a` on it answers with that option
  (`question.answer`; tm asks first). A call whose session the mod
  hasn't heard of shows its task instead (enter opens it).
- **live timing**, a full view (`L` on the dashboard, or the ≡ menu):
  every car of every project in one classification: position, car,
  project, tyres, lap, the three sectors and the status; enter attaches
  (or shows the task). `esc` returns.
- **the debrief**, a command (`B`, the ≡ menu, or `tm mod run pit-wall
  debrief --project <slug>`): what each project did today: tasks done
  today, merged pull requests, flags, cars and radio messages, as a full
  view; from `tm mod run`, which can't open a view, the same in one
  line as a toast.
- **the radio**, a command (`R`, the ≡ menu, `tm mod run pit-wall
  radio`): opens the pit calls card on the top call, where `a` answers
  it, enter attaches and `C` changes tyres; from `tm mod run` it says
  the top call and its options in one line.
- **box box**, OS notifications: when a car calls the pit wall, with
  the question's first three options as buttons, each tm's own answer
  after its confirmation; and once per session when its tyres are gone
  (the context window past the box threshold). A setting turns them
  off.
- **hooks**: a toast for the chequered flag (a pull request merged) and
  for scrutineering (a task reaching review).

A code mod that also carries data files. It asks for `project_read`
(reads your projects), `views` (draws its own panels), `notify` (shows
notifications) and the bindable actions `session.clear` and
`question.answer` (keys and buttons that tm asks you about before each
one runs). It needs terminatr v0.25.3 (mod API 1.7: sections under
each project and badges; the theme's pane palettes need 1.6). The tyre
column reads `session.state`, which for Claude sessions needs tm's
Agent mod on (Settings, *Agent mod*, or `[agent_mod] enabled = true`);
without it Claude cars show no tyres, and no box-box for tyres.

Panes follow the theme on a truecolor terminal, Claude Code included:
Claude panes pick up a generated Claude theme on their next start or
resume, with no manual step. Codex and shells follow without change.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//pit-wall
    tm mod enable pit-wall

The column, the sections, the tab, the card, the views, the commands,
the notifications and the keymap are on as soon as the mod is. For the
rest, pick *pit-wall* in Settings (General) under Theme, Icons and
Layout; each is picked on its own, so you can take only the parts you
want.

## Keys

| key | where | what |
|-----|-------|------|
| `R` | dashboard (prefix+R in a session) | Radio: the pit calls card, on the top call |
| `L` | dashboard (prefix+L in a session) | Live timing |
| `B` | dashboard (prefix+B in a session) | Debrief |
| `enter` | a pit call, a car in live timing | attach (or show the task) |
| `C` | a pit call | change tyres: `session.clear`, tm asks first |
| `a` | a radio row under a pit call | answer with that option, tm asks first |
| `enter` | the race order's header | the race results tab |
| `F1` | anywhere the help is | help |
| `F2`, `F3` | the timing tower | the next and previous car calling |
| `F4` | dashboard | the telemetry (details panel) on and off |
| `F5` | dashboard | the timing tower full or slim |
| `1`–`3` | a box-box notification (`N`) | answer with that option, tm asks first |

The ≡ menu lists *Live timing · pit-wall*, *Debrief · pit-wall* and
the three commands. A key the core or an earlier mod has stays theirs;
the Mods tab then says *key conflict*.

## The theme

| role | dark (night race) | light (day race) |
|------|-------------------|------------------|
| head | papaya, bold | deep papaya, bold |
| plain | light grey | carbon |
| sel | carbon on papaya | white on papaya |
| sel_focus | carbon on light papaya, bold | white on carbon, bold |
| faint | carbon grey | warm grey |
| accent | papaya | deep papaya |
| title | light papaya, bold | carbon, bold |
| bad | red flag, bold | dark red, bold |
| warn | yellow flag | dark yellow |
| good | green flag | dark green |
| info | blue flag | dark blue |

The pane palettes keep the ANSI meanings (red is red, green is green)
so an agent's own colouring still reads; bright yellow is papaya, so
bold-yellow highlights carry the livery.

## The icons

| glyph | icon | on the pit wall |
|-------|------|-----------------|
| `◉` | working, todo.now | a tyre turning |
| `○` | idle, todo.open | a tyre at rest |
| `◌` | starting, ci.run | a tyre being fitted |
| `◈` | review | scrutineering |
| `▹` | running | on an out lap |
| `⚑` | blocked, ci.fail | a flag: stopped on track, a failed check |
| `▚` | done, ci.pass, todo.done | the chequered flag |
| `▣` | folder | the garage |

Everything else (the tree, hint, remote, paused, inactive, the
progress bar) is the unicode set's.

## The tyres

| cell | context used | role |
|------|--------------|------|
| `soft 42%` | below the *worn* setting (60%) | faint |
| `worn 71%` | from *worn* | warn |
| `BOX BOX` | from the *box* setting (85%) | bad |

A session that exits loses its cell. The mod keeps what it saw in its
store, since tm's snapshot at start carries no session's context.

## The race order

    P1 ▚ t-0004          finished (tm done)
    P2 ◈ t-0003 T5 2/2   in review
    P3 ⚑ t-0002 T4 2/3   needs you, 2 of 3 steps
    P4 ◉ t-0001 T3 1/3   working, 1 of 3 steps

At most four rows (the slot's cap); the badge says `1 ⚑` while a car
needs you, else `5 cars`. A project without threads has no section.
Nothing tells a mod that a thread called `tm done`, so the order looks
at its projects again each minute.

## The pit calls

    ⚑ demo t-0012 T12  Which port?              enter attaches · C changes tyres
        radio: 8080  the usual                  a answers 8080
        radio: 3000                             a answers 3000
    ⚑ web t-0003 T4  Merge or release?          enter shows T4

Questions first, then by car. The card is as tall as its rows, up to
20. A multi-select question has no radio rows: pick the answers in the
session. The mod never answers or clears anything: its rows name tm's
actions, and tm checks the live question or session, asks, and runs
them.

## Live timing

    POS  CAR        PROJECT  TYRES     LAP  S1 S2 S3  STATUS
    P1   ▚ t-0004   demo     —              ○ ○ ○     finished
    P2   ⚑ t-0002   web      —         2/3  ○ ○ ○     Which licence?
    P3   ◉ t-0001   demo     worn 64%  1/3  ▚ ▚ ○     working

The same order as the race order, across every project the mod runs
for. Tyres show `—` until the session reports its context. It redraws
on every thread, PR and session event, and each minute.

## The layout

    state, needs, ci, count, tyres, remote, paused, inactive

| part | setting |
|------|---------|
| sidebar | left, 28% of the window (33 cells at 120 columns); the race order under each project |
| details | along the bottom, 35% of the height (14 rows at 40); the lap chart under the panel's own lines |
| coordinator | race control right after NEEDS YOU |
| dashboard | needs you, the project, then cards, then other sessions |
| header, footer, status bar, rows | built-in |

Cockpit puts the sidebar right and the details at 40%; Compact, Zen,
Spotlight, Triage and Mainframe each hide or shrink something. Pit Wall
keeps everything on screen and only moves it.

## What it can't do

These are limits of terminatr's mod API (1.7), not things left out:

- **Not one switch.** Theme, icons and layout are three pickers in
  Settings; enabling the mod doesn't select them.
- **No fonts, no team logo.** The terminal draws the glyphs; an icon is
  one cell, and emoji are refused, so there is no 🏎.
- **Papaya is a role, not a border.** A theme colours text and the
  panes' background; the frames and rules are the terminal's.
- **Laps are steps, not commits.** A mod can't read a thread's
  worktree or run git in it (`~/.terminatr` outside the mod's own
  folder is out of reach), so the lap chart counts the task's steps,
  and the sectors are what the ticker says of the pull request.
- **Sections only show.** The race order, the lap chart and race
  control take no keys; only the race order's header does (enter opens
  the results). Choosing a car is the sidebar's own job.
- **Merged means still open.** A merged pull request shows while its
  thread is open; `tm thread resolve` takes the thread, and with it the
  PR, off the board. Done tasks stay.
- **The radio can't answer by itself.** A mod never runs an action: `R`
  opens the card on the top call, and `a`, enter or `C` there is tm's
  own key, with tm's own confirmation. `tm mod run pit-wall radio`
  can't open a view, so it says the call instead.
- **No button changes tyres.** A notification's buttons may name task
  and question actions only, never a session's, so the tyres-gone
  notification has none: `C` on the car's pit call is the tyre change.
- **Three buttons.** A notification carries at most three; a question
  with more options says *more on the card*, where every option is a
  row.
- **A keymap binds the core's keys only.** The mod's own commands get
  their keys in `mod.toml`; `r` (lower case) is the prefix's and can't
  be bound, so the radio is `R`.
- **Today is the task's date.** The debrief counts the tasks whose
  `updated` date is today; tm keeps no time of day for them, and no
  history for the mod to read.

## Develop

    tm mod dev pit-wall        # run it live, restart on save
    tm mod validate pit-wall && tm mod test pit-wall

One fixture per surface in `tests/`: tyres, order, laps, control,
results, calls, timing, debrief (and `-run` for `tm mod run`), radio
(and `-run`), boxbox, hooks. `main.ts` type-checks with `tsc --strict`
against `types/tm.d.ts` (mod API 1.7).
