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
- **One Light** ([light]): Ghostty's "Atom One Light" terminal palette,
  from [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes)
  (`ghostty/Atom One Light`): the 16 ANSI colours, foreground `#2a2c33` and
  background `#f9f9f9`. It is a community port of Atom's One Light, not
  an Atom file. The palette's cyan equals green and its yellow is pale,
  so the `warn` and `info` roles do not use them: `warn` is Atom One Light's
  amber `#c18401` and `info` its blue `#4078f2`, both readable on `#f9f9f9`.
  The pane palette is unchanged.

## Roles

| role   | One Dark | One Light |
|--------|----------|-----------|
| head, plain | foreground | foreground |
| sel    | background on blue | background on magenta |
| faint  | comment grey | white (ANSI 7) |
| accent | magenta | magenta |
| title  | blue, bold | blue, bold |
| bad    | red | red |
| warn   | yellow | amber `#c18401` |
| good   | green | green |
| info   | cyan | blue `#4078f2` |

## Licence and attribution

MIT, as the upstream sources. Copyright notices kept in this folder:

- `LICENSE-OneDark-Pro`: Copyright (c) 2013-2022 Binaryify (One Dark Pro)
- `LICENSE-onedark.vim`: Copyright (c) 2015 Joshua Dick (onedark.vim, whose
  palette One Dark Pro's matches; kept as a reference, no values copied)
- `LICENSE-iTerm2-Color-Schemes`: Copyright (c) 2011 to Present Mark Badolato
  (the Atom One Light terminal palette)

## Develop

    tm mod dev one
    tm mod validate one && tm mod test one
