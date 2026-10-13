# Dracula

The [Dracula](https://draculatheme.com) palette as a terminatr theme, with
**Alucard**, Dracula's official light theme. On a dark terminal you get
Dracula; on a light one you get Alucard.

On a truecolor terminal the panes follow the theme too (default colours and
the 16 ANSI colours, from the ANSI palette of the
[Dracula spec](https://draculatheme.com/spec)), and from tm 0.25.0 Claude
panes do as well, on next start or resume. Needs tm 0.24.0 or later.

A data mod: tm reads its files; nothing runs.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//dracula
    tm mod enable dracula

Then pick it in Settings (General: Theme).

## Roles

| role   | Dracula    | Alucard    |
|--------|------------|------------|
| head   | foreground, bold | foreground, bold |
| plain  | foreground | foreground |
| sel    | background on purple | background on purple |
| faint  | comment    | comment    |
| accent | pink       | magenta    |
| title  | purple, bold | purple, bold |
| bad    | red        | red        |
| warn   | yellow     | yellow     |
| good   | green      | green      |
| info   | cyan       | cyan       |

## Develop

    tm mod dev dracula
    tm mod validate dracula && tm mod test dracula

## Attribution and licence

Colours are from the Dracula theme by the Dracula Theme organisation
(<https://github.com/dracula/dracula-theme>), MIT licensed. The upstream
licence is kept in [LICENSE](LICENSE).

