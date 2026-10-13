# Catppuccin Latte

The [Catppuccin](https://github.com/catppuccin/palette) Latte palette as a
terminatr theme. Latte is a light flavour: on a light terminal you get
Latte; on a dark one the theme borrows Mocha so text stays readable.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from Catppuccin's terminal palette), and from tm 0.25.0
Claude panes do as well, on next start or resume. No manual Claude `/theme`
is needed on 0.25.0+. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-latte
    tm mod enable catppuccin-latte

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

    tm mod dev catppuccin-latte
    tm mod validate catppuccin-latte && tm mod test catppuccin-latte
