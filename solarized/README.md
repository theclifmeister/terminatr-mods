# Solarized

The [Solarized](https://github.com/altercation/solarized) palette by Ethan
Schoonover as a terminatr theme, in both its dark and light variants: the
console picks one by your terminal's background.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from Solarized's terminal palette), and from tm 0.25.0
Claude panes do as well, on next start or resume. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//solarized
    tm mod enable solarized

Then pick it in Settings (General: Theme).

## Roles

| role   | dark            | light           |
|--------|-----------------|-----------------|
| head   | base1, bold     | base01, bold    |
| plain  | base0           | base00          |
| sel    | base03 on blue  | base3 on blue   |
| faint  | base01          | base1           |
| accent | violet          | violet          |
| title  | blue, bold      | blue, bold      |
| bad    | red             | red             |
| warn   | yellow          | yellow          |
| good   | green           | green           |
| info   | cyan            | cyan            |

## Develop

    tm mod dev solarized
    tm mod validate solarized && tm mod test solarized

## Attribution

Colours are from Solarized, Copyright (c) 2011 Ethan Schoonover, used under
the MIT licence (see `LICENSE`).
