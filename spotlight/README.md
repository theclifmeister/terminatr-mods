# Spotlight

A layout for reading. The sidebar is hidden and the details panel takes
65% of the width on the right, so reports and tasks have room.

| part | setting |
|------|---------|
| sidebar | hidden (`b` cycles full, slim, hidden) |
| details | right, 65% of the width |

A hidden sidebar shows a `⚑ N` badge for what needs you.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//spotlight
    tm mod enable spotlight

then pick it in Settings (General: Layout). Needs terminatr v0.23.0
(mod API 1.5). To change the width, edit `details.size` in `layout.toml`
(20-70%, or 24-200 cells).

## Develop

    tm mod validate spotlight && tm mod test spotlight
