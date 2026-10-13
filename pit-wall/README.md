# Pit Wall

An F1 pit wall for terminatr: threads are cars, you are the race
engineer. One mod, every surface tm offers, in one concept. This is
phase 1 of 3, the data files:

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
  columns in a timing screen's order: state, flag, sector, laps), the
  telemetry along the bottom (the details panel, 35% of the height),
  and the pit calls (mods' cards) before the sessions outside projects.

Phase 2 adds the tyre-wear column, the race order under each project,
the lap chart and race control panels and the race results tab; phase 3
the pit calls card, live timing, the Debrief command, box-box
notifications and the radio key. Until then Pit Wall asks for no
permission: a data mod, no code.

It needs terminatr v0.25.3 (mod API 1.7, which the later phases use;
the theme's pane palettes need 1.6).

Panes follow the theme on a truecolor terminal, Claude Code included:
Claude panes pick up a generated Claude theme on their next start or
resume, with no manual step. Codex and shells follow without change.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//pit-wall
    tm mod enable pit-wall

Then pick *pit-wall* in Settings (General) under Theme, Icons and
Layout; each is picked on its own, so you can take only the parts you
want.

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

## The layout

    state, needs, ci, count, remote, paused, inactive

| part | setting |
|------|---------|
| sidebar | left, 28% of the window (33 cells at 120 columns) |
| details | along the bottom, 35% of the height (14 rows at 40) |
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

## Develop

    tm mod validate pit-wall && tm mod test pit-wall
