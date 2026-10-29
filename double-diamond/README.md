# Double diamond

A coordinator playbook that runs a project's work through the double
diamond, in order: **Discover**, **Define**, **Develop**, **Deliver**.
It is house rules added after tm's own policy (`default-policy`), plus a
task template per phase. It replaces nothing: tm's safety rules come
first, and the default policy (proposing and waiting for the go-ahead,
thread caps, only you accepting work, merging) stays whole. The playbook
only adds the phase discipline.

| phase | what the coordinator does | template |
|-------|---------------------------|----------|
| Discover | proposes 2-4 research tasks (`--repo none`); each thread reports and attaches its material; the coordinator files the key insights as memory notes | `discover` |
| Define | one task per problem; its write-up is a problem statement, success criteria and open questions; your answers go in with `tm design set NAME --answer`; the agreed statement extends PROJECT.md's goal (you edit it, or the coordinator does on your word) | `define` |
| Develop | one spike per solution option, all naming the same design, in parallel within the thread caps; each report's `## Check` says how to judge its option; you pick one, recorded as a `Picked:` answer; the others are sent back or archived, their reports kept as the rationale | `develop` |
| Deliver | build tasks naming the design, ordered with `--after`; progress on the design's canvas | `deliver` |

There is no second store. A design's phase is read from what tm already
holds: its recorded design (`tm design list`), the tasks that name it
and their title prefixes (`Define:`, `Develop:`, `Deliver:`, which the
templates set), its answers and the open questions on its tasks. Work
that belongs to no problem (a bug fix, a chore) is "outside the diamond"
and goes as before.

The coordinator names a design's phase when it proposes or reports work
("T31 (Deliver: sync API), design sync, Deliver"), and adds a line to its
reply summary while any design is open:

    Phases: sync Develop (your pick of T14-T16), search Define (2 questions)

The rules are in [rules/coordinator.md](rules/coordinator.md); `tm skill
coordinator` shows them under `## House rules (mod: double-diamond)`.

## Gates

Off by default, per project. With the `gates` setting on for a project,
its coordinator proposes no build task for a design still in Define or
with open questions: it says which gate holds it and proposes what
clears it instead. You can lift a gate for one task in chat; the
coordinator notes it on the task. Without the gates, the coordinator may
propose such a task but says which questions are open.

Turn them on for a project:

    tm mod settings double-diamond --project <slug> gates=true

or in the project popup's Settings tab, the row "Double diamond
settings". `--reset gates` (with `--project`) puts it back. The gate
rules are a `tm:if gates` section of the rules file, so they are in a
project's rules only while its setting is on.

### Moving from double-diamond-gates

Version 2.0.0 folds the separate double-diamond-gates mod into this one.
For each project that had it enabled:

    tm mod remove double-diamond-gates
    tm mod settings double-diamond --project <slug> gates=true

(or the project popup's Settings tab). Then update this mod
(`tm mod update double-diamond`); it now needs terminatr v0.63.0 and mod
API 1.11, and the setting is human-only.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//double-diamond
    tm mod enable double-diamond --project <slug>

Leave out `--project` to run it for every project. For the gates too,
set `gates=true` for the project (see [Gates](#gates)).

The rules take effect when the coordinator next reads them (a new or
cleared conversation). The mod needs terminatr v0.63.0 (`min_tm`): mod
API 1.11 for the per-project setting and `tm:if` sections, on top of
`tm design set --answer` from v0.52.0. Then add work by phase:

    tm task add "offline sync" --template define

## Trial

A two-week trial on one real project, which you choose. Enable the mod and its gates
for it only, note how the project ran the two weeks before, and at the
end look at its TASKS.md, `tm design list`, the reports and the
coordinator's replies. The trial succeeds when:

- **Traceable builds.** Every `Deliver:` task started in the two weeks
  names a design whose answers include a `Picked:` line and whose
  questions were answered before the task was delegated (or carries a
  "gate lifted" note you wrote the reason for).
- **Phases you can read.** From the coordinator's replies alone, without
  opening the board, you can say which phase each open design is in;
  check it against `tm design list` and the tasks at the end of each
  week. Every reply that proposes or reports design work names the phase.
- **Fewer unclear-problem send-backs.** Count the send-backs whose note
  is about what the problem or the goal was (not about code quality).
  Success is fewer than the two weeks before, and none on a task whose
  design was through Define.
- **Options compared, not assumed.** At least one design went through
  Develop with two or more spikes, and you picked from their `## Check`
  lines; the reports of the options not picked are still in the library.
- **No second store.** Each agreed problem statement is in PROJECT.md's
  goal and nowhere else; insights from Discover are memory notes.
- **Not in the way.** The phases cost no more than a turn or two per
  design, and bug fixes and chores outside the diamond went as before.
  If you lifted a gate more than once or twice, the gate (or the
  playbook) is wrong, and that is a finding too.

Write down at the end what to keep, what to drop, and which gaps were
tm's (they feed terminatr's alternatives-as-a-group, tracked problem
statements and hard gates).

## Develop

    tm mod validate double-diamond && tm mod test double-diamond
    sh double-diamond/check.sh

`tests/` holds `tm mod test` fixtures with projects that have the gates
on and off, checking the rules contain or lack the gate section.
`check.sh` covers what fixtures can't: it installs the mod in a scratch
tm (its own home and socket), and checks that the playbook reaches every
project's coordinator after tm's own policy, that `gates=true` set with
`tm mod settings --project` reaches only that project, and that each
template sets its phase on a task. CI runs both.
