# Rosé Pine

The [Rosé Pine](https://github.com/rose-pine) Rosé Pine palette as a
terminatr theme. On a dark terminal you get Rosé Pine; on a light one the
theme uses Rosé Pine Dawn so text stays readable.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from Rosé Pine's terminal palette), and from tm 0.25.0
Claude panes do as well, on next start or resume. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//rose-pine
    tm mod enable rose-pine

Then pick it in Settings (General: Theme).

## Roles

| role   | colour   |
|--------|----------|
| head   | text, bold |
| plain  | text     |
| sel    | base on iris |
| faint  | muted    |
| accent | iris     |
| title  | foam, bold |
| bad    | love     |
| warn   | gold     |
| good   | pine     |
| info   | rose     |

## Attribution

Colours are from the Rosé Pine palette and its terminal ports
(<https://github.com/rose-pine>), © 2023 Rosé Pine, MIT licensed; the
licence text is in [LICENSE](LICENSE).

## Develop

    tm mod dev rose-pine
    tm mod validate rose-pine && tm mod test rose-pine
