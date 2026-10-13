# GitHub

The [GitHub](https://github.com/primer/github-vscode-theme) Dark Default and
Light Default palettes as a terminatr theme. On a dark terminal you get Dark
Default; on a light one, Light Default.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from the theme's `terminal.ansi*` colours), and from tm
0.25.0 Claude panes do as well, on next start or resume. Needs tm 0.24.0 or
later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//github
    tm mod enable github

Then pick it in Settings (General: Theme).

## Roles

| role   | dark default | light default |
|--------|--------------|---------------|
| head, plain | default text | default text |
| sel    | canvas on blue | white on blue |
| faint  | muted text | muted text |
| accent | magenta | magenta |
| title  | blue, bold | blue, bold |
| bad    | red | red |
| warn   | yellow | yellow |
| good   | green | green |
| info   | cyan | cyan |

## Attribution

Colours are from [primer/github-vscode-theme](https://github.com/primer/github-vscode-theme)
(its `terminal.ansi*` colours, from `@primer/primitives` 7.10.0, and the
default text colours it sets in `src/colors.js`), MIT licensed,
Copyright (c) 2020 Primer. The licence is in [LICENSE](LICENSE).
