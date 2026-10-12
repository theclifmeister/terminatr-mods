# terminatr-mods

User mods for [terminatr](https://github.com/theclifmeister/terminatr), one
mod per subfolder. Install one with `tm mod install <git-url>//<subfolder>`,
then turn it on in the Mods tab or with `tm mod enable <id>`.

## Views

| mod | what | install |
|-----|------|---------|
| [Orbit](orbit) | a radar full view (≡ menu): each project a planet, its threads orbiting it, closer as they near done, pulsing when they need you; enter attaches | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//orbit` |

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
