# Kanagawa Dragon

The [Kanagawa](https://github.com/rebelot/kanagawa.nvim) Dragon palette as a
terminatr theme. On a dark terminal you get Dragon; on a light one you get
Lotus, Kanagawa's light variant.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from the upstream terminal palettes), and from tm 0.25.0
Claude panes do as well, on next start or resume. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//kanagawa-dragon
    tm mod enable kanagawa-dragon

Then pick it in Settings (General: Theme).

## Develop

    tm mod dev kanagawa-dragon
    tm mod validate kanagawa-dragon && tm mod test kanagawa-dragon

## Attribution

Colours are from [kanagawa.nvim](https://github.com/rebelot/kanagawa.nvim)
by Tommaso Laurenzi, MIT licensed. Copyright (c) 2021 Tommaso Laurenzi; the
licence text is in `LICENSE`.
