# One

One Dark and One Light as a terminatr theme: One Dark when the terminal is
dark, One Light when it is light.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours), and from tm 0.25.0 Claude panes do as well, on next
start or resume. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//one
    tm mod enable one

Then pick it in Settings (General: Theme).

## Where the colours come from

Atom shipped no terminal palette, so the sources differ per side:

- **One Dark** ([dark]): the terminal colours of
  [One Dark Pro](https://github.com/Binaryify/OneDark-Pro)
  (`themes/OneDark-Pro.json`, `terminal.ansi*`, foreground and background),
  which match Atom's One Dark background `#282c34` and foreground `#abb2bf`.
- **One Light** ([light]): Atom's own
  [one-light-syntax](https://github.com/atom/atom/tree/master/packages/one-light-syntax)
  colours (`colors.less`, HSL converted to hex): foreground `#383a42`,
  background `#fafafa`. Neither One Dark Pro nor onedark.vim defines a light
  terminal palette, so the 16 ANSI slots are a mapping, not an upstream
  table: black/foreground mono-1, red hue-5, green hue-4, yellow orange
  hue-6, blue hue-2, magenta hue-3, cyan hue-1, white mono-3, bright black
  mono-2, bright red hue-5-2; other bright colours repeat the normal ones,
  and bright white is the background.

## Roles

| role   | One Dark | One Light |
|--------|----------|-----------|
| head, plain | foreground | foreground |
| sel    | background on blue | background on purple |
| faint  | comment grey | mono-3 |
| accent | magenta | purple |
| title  | blue, bold | blue, bold |
| bad    | red | red |
| warn   | yellow | orange |
| good   | green | green |
| info   | cyan | cyan |

## Licence and attribution

MIT, as the upstream sources. Copyright notices kept in this folder:

- `LICENSE-OneDark-Pro`: Copyright (c) 2013-2022 Binaryify (One Dark Pro)
- `LICENSE-onedark.vim`: Copyright (c) 2015 Joshua Dick (onedark.vim, whose
  palette One Dark Pro's matches; kept as a reference, no values copied)
- `LICENSE-atom`: Copyright (c) 2011-2022 GitHub Inc. (Atom, One Light)

## Develop

    tm mod dev one
    tm mod validate one && tm mod test one
