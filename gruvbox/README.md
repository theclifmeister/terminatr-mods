# Gruvbox

The [Gruvbox](https://github.com/morhetz/gruvbox) palette (medium contrast)
as a terminatr theme: dark on a dark terminal, light on a light one.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from Gruvbox's terminal palette), and from tm 0.25.0
Claude panes do as well, on next start or resume. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//gruvbox
    tm mod enable gruvbox

Then pick it in Settings (General: Theme).

## Roles

| role   | dark   | light  |
|--------|--------|--------|
| head, plain | fg1 (bold for head) | fg1 |
| sel    | bg0 on yellow | bg0 on faded yellow |
| faint  | gray   | gray   |
| accent | purple | faded purple |
| title  | blue, bold | faded blue, bold |
| bad    | red    | faded red |
| warn   | yellow | faded yellow |
| good   | green  | faded green |
| info   | aqua   | faded aqua |

## Develop

    tm mod dev gruvbox
    tm mod validate gruvbox && tm mod test gruvbox

## Attribution

Colours are from Gruvbox by morhetz (https://github.com/morhetz/gruvbox) and
its terminal palette in https://github.com/morhetz/gruvbox-contrib. Gruvbox's
README states its licence as MIT/X11 (the repository has no LICENSE file and
names no copyright holder in the README):

    License
    -------
    MIT/X11
