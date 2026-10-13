# Tokyo Night Moon

The [Tokyo Night](https://github.com/folke/tokyonight.nvim) Moon palette
as a terminatr theme. Moon is a dark flavour: on a dark terminal you get
Moon; on a light one the theme uses Tokyo Night Day so text stays readable.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from the upstream terminal palette), and from tm 0.25.0
Claude panes do as well, on next start or resume. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//tokyonight-moon
    tm mod enable tokyonight-moon

Then pick it in Settings (General: Theme).

## Roles

| role   | colour     |
|--------|------------|
| head   | foreground, bold |
| plain  | foreground |
| sel    | background on magenta |
| faint  | comment    |
| accent | magenta    |
| title  | blue, bold |
| bad    | red        |
| warn   | yellow     |
| good   | green      |
| info   | cyan       |

## Attribution

Colours are from [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim)
(`extras/ghostty/tokyonight_moon` and `tokyonight_day`, plus the comment colour),
licensed under the Apache License 2.0; the licence text is in `LICENSE` here.
The upstream licence file carries no copyright holder line, so none is
reproduced. The theme itself is Tokyo Night by enkia, ported to Neovim and other
tools by folke. This mod is an unofficial port, not endorsed by the upstream
authors; the colour values were converted into tm's theme format.

## Develop

    tm mod dev tokyonight-moon
    tm mod validate tokyonight-moon && tm mod test tokyonight-moon
