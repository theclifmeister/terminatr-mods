# Catppuccin Macchiato

The [Catppuccin](https://github.com/catppuccin/palette) Macchiato palette as a
terminatr theme. Macchiato is a dark flavour: on a dark terminal you get
Macchiato; on a light one the theme borrows Latte so text stays readable.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-macchiato
    tm mod enable catppuccin-macchiato

Then pick it in Settings (General: Theme).

## Roles

| role   | colour   |
|--------|----------|
| head   | text, bold |
| plain  | text     |
| sel    | base on mauve |
| faint  | overlay1 |
| accent | mauve    |
| title  | blue, bold |
| bad    | red      |
| warn   | yellow   |
| good   | green    |
| info   | sapphire |

## Develop

    tm mod dev catppuccin-macchiato
    tm mod validate catppuccin-macchiato && tm mod test catppuccin-macchiato
