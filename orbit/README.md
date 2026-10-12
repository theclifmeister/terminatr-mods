# Orbit

A radar of your projects as a terminatr full view. Each project is a
planet and its threads orbit it. A thread moves closer to its planet as
its task gets nearer done (steps done out of its steps; review and done
sit closest). A thread that needs you pulses. Below the radar there's a
detail line for the selected thread, then the list of threads.

```
              · · ·· · ·                       nearer the planet, nearer done
          · ·  · · · · · · ·                   ● working  ○ idle  ◆ review
         ·  ··           ·· · ·                ✓ done  ▲ needs you
        ···                 ·· ·
       ··      · · · · ·     ● T1
      ··  T3 [◆]         ·      ··
     · ·     ·    (●)    ·     · ·
      ··      · · · · ·      · ·
          · · ··▲ T2
               demo 0/3
```

A code mod: it reads your projects and draws its own view. It can't
change anything by itself: enter on a row runs terminatr's own
`session.attach` (or `task.show` for a thread with no session), with
terminatr's checks.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//orbit
    tm mod enable orbit

Run these in a terminal of your own, not in an agent's pane. terminatr
asks you to confirm what the mod reads and draws.

## Use

Open it from the dashboard's ≡ menu (**Orbit · orbit**). esc goes back.

| key | does |
|-----|------|
| ↑ ↓ | pick a thread: the radar puts it in brackets, in the accent colour, and the detail line describes it |
| enter | attach to the thread's session (show its task when it has none) |
| p | pause or resume the orbits |
| / | filter the list |

Settings, in the mod's settings page (Mods tab):

- **animate** (on): turn the orbits and pulse what needs you, once a
  second, while the view is open.
- **glyphs** (`unicode`): `ascii` draws with `* o + v !` for terminals
  that lack `● ○ ◆ ✓ ▲`.

Colours come from your theme's roles (good, warn, bad, info, accent,
faint, head), never fixed colours. So the radar follows the built-in
theme, its light and dark looks, theme mods such as Catppuccin, and
`NO_COLOR`.

## What a full view can and can't do

A mod view is a tree of widgets that terminatr draws. It isn't a pixel
or cell canvas. Orbit lays the radar out on its own grid and publishes
each line as spans of one theme role each. That brings some limits:

- **At most 16 spans per line.** On a crowded line, the least important
  marks (orbit rings first) take a neighbour's colour.
- **One frame a second.** Consoles poll view trees once a second, so the
  animation ticks at 1 Hz. The timer runs only while the view is open.
- **Size is fixed when the view opens.** terminatr gives the width and
  height on `view.opened` and doesn't send a resize. After resizing,
  reopen the view (esc, then ≡) to redraw it at the new size.
- **No mouse on the radar.** You select a thread with the list under
  the radar. A click there selects too.
- **Single-cell glyphs only.** terminatr turns wide glyphs (emoji, CJK)
  into `?`. The radar uses the same one-cell glyphs as terminatr's own
  unicode icon set.

## Develop

    tm mod dev orbit                              # run it live, restart on save
    tm mod validate orbit && tm mod test orbit    # check it, replay tests/*.json
