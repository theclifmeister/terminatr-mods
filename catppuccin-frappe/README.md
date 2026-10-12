# Catppuccin Frappé

The [Catppuccin](https://github.com/catppuccin/palette) Frappé palette as a
terminatr theme. Frappé is a dark flavour: on a dark terminal you get
Frappé; on a light one the theme borrows Latte so text stays readable.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-frappe
    tm mod enable catppuccin-frappe

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

    tm mod dev catppuccin-frappe
    tm mod validate catppuccin-frappe && tm mod test catppuccin-frappe
