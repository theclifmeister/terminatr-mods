# Catppuccin Mocha

The [Catppuccin](https://github.com/catppuccin/palette) Mocha palette as a
terminatr theme. Mocha is a dark flavour: on a dark terminal you get
Mocha; on a light one the theme borrows Latte so text stays readable.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-mocha
    tm mod enable catppuccin-mocha

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

    tm mod dev catppuccin-mocha
    tm mod validate catppuccin-mocha && tm mod test catppuccin-mocha
