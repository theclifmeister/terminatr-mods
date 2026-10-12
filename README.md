# terminatr-mods

User mods for [terminatr](https://github.com/theclifmeister/terminatr), one
mod per subfolder. Install one with `tm mod install <git-url>//<subfolder>`,
then turn it on in the Mods tab or with `tm mod enable <id>`.

## Views

| mod | what | install |
|-----|------|---------|
| [Mission control](mission-control) | a kanban board of every project's tasks (Ready, Started, Review, Done) with each thread's live state, PR and CI, and a needs-you mark; a full view from the dashboard's ≡ menu | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//mission-control` |

Open it from the ≡ menu (*Mission control · mission-control*); esc
returns. Its README lists the keys and what the mod API doesn't let it
do.

## Themes

The four [Catppuccin](https://github.com/catppuccin/palette) flavours. Each
sets both the light and dark looks: its own flavour on its side, and Latte
(or Mocha, for Latte) on the other.

| mod | flavour | install |
|-----|---------|---------|
| Catppuccin Latte | light | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-latte` |
| Catppuccin Frappé | dark | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-frappe` |
| Catppuccin Macchiato | dark | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-macchiato` |
| Catppuccin Mocha | dark | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-mocha` |

For example:

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//catppuccin-mocha
    tm mod enable catppuccin-mocha

then pick it in Settings (General: Theme). To pin a release, add `@<tag>`
after the subfolder.
