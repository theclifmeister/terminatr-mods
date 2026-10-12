# Triage

A layout for clearing the queue. The dashboard shows what needs you,
then the cards; the other section is left out. The sidebar is slim and on
the right.

| part | setting |
|------|---------|
| dashboard | needs, then cards (project stays, first) |
| sidebar | slim, on the right |

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//triage
    tm mod enable triage

then pick it in Settings (General: Layout). Needs terminatr v0.23.0
(mod API 1.5).

terminatr always keeps the `project` section: left out of the list, it
comes back first, so the order is project, needs, cards.

## Develop

    tm mod validate triage && tm mod test triage
