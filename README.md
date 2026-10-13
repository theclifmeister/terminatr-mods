# terminatr-mods

User mods for [terminatr](https://github.com/theclifmeister/terminatr), one
mod per subfolder. Install one with `tm mod install <git-url>//<subfolder>`,
then turn it on in the Mods tab or with `tm mod enable <id>`.

Every pull request and push to main runs the **mods** check
([.github/workflows/mods.yml](.github/workflows/mods.yml)): it installs
tm v0.24.0 and runs `tm mod validate` and `tm mod test` on each folder
with a `mod.toml`. Run the same locally before pushing:

    tm mod validate */ && tm mod test */

(`tm mod test` may print `read/write on closed pipe`; that's harness
noise, the exit code is what counts.)

## Views

| mod | what | install |
|-----|------|---------|
| [Mission control](mission-control) | a kanban board of every project's tasks (Ready, Started, Review, Done) with each thread's live state, PR and CI, and a needs-you mark; a full view from the dashboard's ≡ menu | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//mission-control` |
| [Orbit](orbit) | a radar full view (≡ menu): each project a planet, its threads orbiting it, closer as they near done, pulsing when they need you; enter attaches | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//orbit` |

Open each with its dashboard key (**M** for Mission control, **O** for
Orbit) or from the ≡ menu (*Mission control · mission-control*,
*Orbit · orbit*); esc returns. Each README lists the keys and what the
mod API doesn't let it do.

## Layouts

Layout-only mods: no code, just where the panels go. Each needs terminatr
v0.23.0. Install one, enable it, then pick it in Settings (General:
Layout). terminatr's own Zen, Cockpit and Compact layouts are built in.

| mod | what | pick it when | install |
|-----|------|--------------|---------|
| [Spotlight](spotlight) | no sidebar, details on the right at 65% | you read reports and tasks more than you scan threads | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//spotlight` |
| [Triage](triage) | dashboard of needs then cards, slim sidebar on the right | you start the day by clearing what needs you | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//triage` |
| [Mainframe](mainframe) | a 3270 screen: no header, compact rows, narrow left sidebar, details along the bottom | you want the green-screen look (comes with the Mainframe total conversion below) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//mainframe` |

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

### More themes

Same idea, other palettes: each follows your terminal, with its dark flavour
on dark terminals and the light side named below on light ones. Install and
enable them the same way.

| mod | looks | colours from | install |
|-----|-------|--------------|---------|
| [Tokyo Night Night](tokyonight-night) | dark Night; Day on light terminals | [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//tokyonight-night` |
| [Tokyo Night Storm](tokyonight-storm) | dark Storm; Day on light terminals | [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//tokyonight-storm` |
| [Tokyo Night Moon](tokyonight-moon) | dark Moon; Day on light terminals | [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//tokyonight-moon` |
| [Dracula](dracula) | dark Dracula; Alucard on light terminals | [Dracula](https://github.com/dracula/dracula-theme) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//dracula` |
| [Gruvbox](gruvbox) | dark and light, medium contrast | [morhetz/gruvbox](https://github.com/morhetz/gruvbox) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//gruvbox` |
| [GitHub](github) | dark Dark Default; Light Default on light terminals | [primer/github-vscode-theme](https://github.com/primer/github-vscode-theme) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//github` |
| [One](one) | One Dark; One Light on light terminals | [One Dark Pro](https://github.com/Binaryify/OneDark-Pro), Atom One Light via [iTerm2-Color-Schemes](https://github.com/mbadolato/iTerm2-Color-Schemes) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//one` |
| [Rosé Pine](rose-pine) | dark Rosé Pine; Dawn on light terminals | [Rosé Pine](https://github.com/rose-pine) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//rose-pine` |
| [Rosé Pine Moon](rose-pine-moon) | dark Moon; Dawn on light terminals | [Rosé Pine](https://github.com/rose-pine) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//rose-pine-moon` |
| [Kanagawa Wave](kanagawa-wave) | dark Wave; Lotus on light terminals | [rebelot/kanagawa.nvim](https://github.com/rebelot/kanagawa.nvim) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//kanagawa-wave` |
| [Kanagawa Dragon](kanagawa-dragon) | dark Dragon; Lotus on light terminals | [rebelot/kanagawa.nvim](https://github.com/rebelot/kanagawa.nvim) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//kanagawa-dragon` |
| [Solarized](solarized) | dark and light variants | [Ethan Schoonover](https://github.com/altercation/solarized) | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//solarized` |

### Total conversions

A theme, an icon set, a layout and sidebar columns in one mod. Pick its
parts in Settings (General: Theme, Icons and Layout).

| mod | what | install |
|-----|------|---------|
| [Mainframe](mainframe) | an IBM 3270 green screen: green phosphor (green-bar paper on light terminals), ASCII icons, a 3270 screen layout and a JES-style JOB column (RUN, WAIT, HELD, DONE, ABEND); needs terminatr v0.24.0 | `tm mod install https://github.com/theclifmeister/terminatr-mods.git//mainframe` |
