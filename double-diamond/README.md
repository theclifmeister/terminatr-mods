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

Off by default. With [Double diamond gates](../double-diamond-gates)
enabled for a project, its coordinator proposes no build task for a
design still in Define or with open questions: it says which gate holds
it and proposes what clears it instead. You can lift a gate for one task
in chat; the coordinator notes it on the task. Without the gates, the
coordinator may propose such a task but says which questions are open.

The gates are a second mod because a rules file can't read a setting:
its text is the same for every project, and a mod's settings are not per
project. What is per project is where a mod runs (`tm mod enable <id>
--project <slug>`), so that is the switch. A per-project setting a rules
mod could read would let one mod do both; that is a request for
terminatr, not something this mod works around.

## Install

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//double-diamond
    tm mod enable double-diamond --project <slug>

Leave out `--project` to run it for every project. For the gates too:

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//double-diamond-gates
    tm mod enable double-diamond-gates --project <slug>

The rules take effect when the coordinator next reads them (a new or
cleared conversation). The playbook uses `tm design set --answer`, which
needs terminatr v0.52.0, which the mod's `min_tm` requires; it loads on
mod API 1.0. Then add
work by phase:

    tm task add "offline sync" --template define

## Trial

A two-week trial on one real project, which you choose. Enable both mods
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

    tm mod validate double-diamond double-diamond-gates
    sh double-diamond/check.sh

`tm mod test` only validates a data mod. `check.sh` installs both mods
in a scratch tm (its own home and socket), and checks that the playbook
reaches every project's coordinator after tm's own policy, that the
gates reach only the project they are enabled for, and that each
template sets its phase on a task. CI runs it too.
