# Mainframe

An IBM 3270 green screen for terminatr, in one mod:

- **a theme**: green phosphor on a dark terminal (bright green text, dim
  green for faint, reverse video for the selection, amber warnings, red
  failures, turquoise info), and green-bar paper on a light one (dark
  green ink on the pale background), so it stays readable either way
- **an icon set**: plain ASCII glyphs (`*` working, `X` blocked, `.`
  idle, `#` done, `|-` / `+-` for the tree)
- **a layout**: a 3270 screen: no header, compact rows and status bar, a
  narrow sidebar on the left with the job status first, and the details
  along the bottom like a message area
- **a JOB column**: each thread's status in the sidebar, in the words of
  a JES job queue

A code mod (for the JOB column) that also carries data files. It asks for
`project_read` (reads your projects). It needs terminatr v0.22.0 or later
(the theme sets `sel_focus`, the sidebar's focused row).

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//mainframe
    tm mod enable mainframe

The JOB column shows as soon as the mod is on. For the rest, pick
*mainframe* in Settings (General) under Theme, Icons and Layout; each is
picked on its own, so you can take only the parts you want.

## The JOB column

| status | when |
|--------|------|
| ABEND | its pull request's checks fail |
| HELD | it needs you, or waits on a question or a permission |
| DONE | it called `tm done` |
| RUN | its agent is running a turn |
| WAIT | anything else: idle, starting, or its session gone |

The first that holds wins, in that order: a thread that needs you while
its CI fails shows ABEND. tm sends no event when a thread calls
`tm done`, so DONE can take up to a minute to show.

## The layout

    JOB, needs, state, count, paused, inactive, remote

The PR/CI column (`ci`) is left out: ABEND already marks a failing
check. Pick the default layout to get it back.

The rest of the screen:

| part | setting |
|------|---------|
| header | hidden |
| rows, status bar | compact |
| sidebar | left, 34 cells wide |
| details | along the bottom, 30% of the height (12 rows at 120x40, 7 at 80x24) |

The layout needs terminatr v0.23.0 (mod API 1.5).

## Roles

| role | dark (phosphor) | light (paper) |
|------|-----------------|---------------|
| head | bright green, bold | near-black green, bold |
| plain | bright green | dark green |
| sel | black on green | paper on green |
| sel_focus | black on bright green, bold | paper on near-black green, bold |
| faint | dim green | grey green |
| accent | pale green | green |
| title | green-white, bold | dark green, bold |
| bad | red, bold | red, bold |
| warn | amber | brown amber |
| good | bright green | green |
| info | turquoise | teal |

## What it can't do

These are limits of terminatr's mod API (1.4), not things left out:

- **No background.** A theme colours text and selections, not the
  terminal's background, so the phosphor look wants a black terminal.
- **No fonts or borders.** The 3270 font and the screen's frame are the
  terminal's to draw.
- **Not one switch.** Theme, icons and layout are three pickers in
  Settings; enabling the mod doesn't select them.

## Develop

    tm mod dev mainframe       # run it live, restart on save
    tm mod validate mainframe && tm mod test mainframe
