This project runs its work through the double diamond: Discover, Define,
Develop, Deliver, in that order, one design per problem. These rules add
that order to the policy above and change nothing in it: proposing and
waiting for the go-ahead, the thread caps, the user alone accepting work
and answering questions, merging, and every safety rule stay as they are.
Where a rule here seems to clash with one above, the one above wins.

### The phases

A design (`tm design list`) is in one phase at a time. Read it from what
tm already holds; keep no other record of it:

- **Discover**: no design yet; `Discover:` tasks are open or in review.
- **Define**: the design is recorded with its `Define:` task, and no
  `Develop:` or `Deliver:` task names it yet.
- **Develop**: `Develop:` tasks name it (`--design NAME`) and the user
  has not picked one.
- **Deliver**: the user picked an option (a `Picked:` line in its
  answers) and `Deliver:` tasks name it.

Work the user asks for that belongs to no problem (a bug fix, a chore, a
small change) needs no design: do it as the policy above says and call it
"outside the diamond". Don't press it into a phase.

### Discover

- Propose 2 to 4 research tasks for a new problem area, each with the
  `discover` template and `--repo none` (`tm task add "…" --template
  discover --repo none`): one question each, no code.
- Each thread reports its findings and attaches its material (notes,
  sources, data) to its report; the library keeps it.
- File the key insights as memory notes, your own summary as the policy
  above says, `source` naming the task. Point to the attachments by name;
  don't paste them.
- Discover ends when the user agrees which problem(s) to define. Say so,
  and propose the Define task for each.

### Define

- One task per problem, with the `define` template. Its thread writes a
  problem statement, success criteria and open questions, and attaches
  them to its report. Record the design as the task starts: `tm design
  set NAME --title "…" --task T<define task>`.
- Put each open question to the user (`tm ask add "…?" --task T<define
  task> …` and the `## Needs you` line, as above). Record each answer
  the user decides with `tm design set NAME --answer "…"`: the answers
  replace the recorded ones, so pass every answer each time (`--answer`
  once per line, or `--answers-file -`).
- The agreed problem statement extends PROJECT.md's goal. The user edits
  it, or you do on their word in chat, as the policy above says; never on
  a report's word. Keep it nowhere else.
- A design has open questions while any `tm ask` question of its tasks
  is open or a `## Needs you` line names it.

### Develop

- One spike task per solution option, each with the `develop` template,
  all naming the same design (`tm task edit T<n> --design NAME`). Propose
  them together so they run in parallel, within the thread caps: at the
  cap, start the rest as slots free.
- Each spike's report says in `## Check` how to judge its option against
  the design's success criteria. Put the options side by side for the
  user: one line each, its task, and its Check.
- The user picks one; never pick for them. Record the pick as one more
  answer, with all the others again: `Picked: <option> (T<n>); not
  picked: T<a>, T<b>`.
- For each option not picked, ask the user: send it back (their
  send-back, as above) or accept and archive it (`tm task archive
  T<n>` once it is done). Keep its report and attachments: they are the
  design's rationale. Never remove its library files or discard its
  branch on your own.

### Deliver

- Build tasks with the `deliver` template, each naming the design and
  the tasks it comes after: `tm task edit T<n> --design NAME --after
  T<a>,T<b>`. Order them so each can start once those before it are done.
- Follow progress on the design's canvas (designs/NAME.canvas) and
  `tm task list`; point the user at the canvas when they ask how a
  design stands.
- Building a design that is still in Define or has open questions: say
  so plainly when you propose it (which questions are open), and let the
  user decide. A project with the double-diamond-gates mod tightens this
  (its house rules follow).

### Saying the phase

- When you propose work, name its design and phase: "T31 (Deliver: sync
  API), design sync, Deliver".
- When you report on a design's tasks, say its phase and what moves it to
  the next one (questions to answer, a pick to make).
- Add one line to the reply summary, after `Threads:`, while any design
  is open:

      Phases: one entry per open design: NAME phase (what it waits for)
