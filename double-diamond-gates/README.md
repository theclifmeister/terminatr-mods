# Double diamond gates

Soft gates for the [Double diamond](../double-diamond) playbook, opt-in
per project. With them, the coordinator proposes no build (`Deliver:`)
task for a design still in Define or with open questions: it says which
gate holds it and proposes what clears it (the question to answer, the
Define task to finish, the spikes to run, the pick to make). You can
lift a gate for one task in chat; the coordinator writes "gate lifted by
the user" and your reason in the task's notes. Bug fixes and chores
outside the diamond have no gate.

The gates are soft: they are rules the coordinator follows, not a check
tm enforces. The rules are in [rules/coordinator.md](rules/coordinator.md).

## Install

Needs the double-diamond mod. Enable it for the projects you want gated
only:

    tm mod install https://github.com/theclifmeister/terminatr-mods.git//double-diamond-gates
    tm mod enable double-diamond-gates --project <slug>

`tm mod disable double-diamond-gates --project <slug>` turns them off
for that project again. Why this is a mod of its own and not a setting:
see [Gates](../double-diamond/README.md#gates).

## Develop

    tm mod validate double-diamond-gates && sh double-diamond/check.sh
