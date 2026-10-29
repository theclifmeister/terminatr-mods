#!/bin/sh
# Checks the Double diamond mod in a scratch tm (its own home and socket,
# so your own tm is untouched): the playbook reaches every project's
# coordinator after tm's own policy, and the four templates lay their
# phase on a task. What the gates setting does to the rules, per project,
# is in tests/ (tm mod test); this is what fixtures can't cover.
#
#   sh double-diamond/check.sh   (from the repository root)
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
tmp=$(mktemp -d "${TMPDIR:-/tmp}/dd-check.XXXXXX")
trap 'rm -rf "$tmp"' EXIT

t() {
	env -u TERMINATR_SESSION TERMINATR_HOME="$tmp/home" TERMINATR_SOCKET="$tmp/tm.sock" tm "$@"
}
fail() {
	echo "FAIL: $*" >&2
	exit 1
}

# Install copies, so tm reads the folders as a user's install would.
cp -R "$root/double-diamond" "$tmp/"
t project new trial --goal "Trial project" >/dev/null
t project new other --goal "Other project" >/dev/null
t mod install "$tmp/double-diamond" --yes >/dev/null
t mod enable double-diamond --yes >/dev/null
t mod settings double-diamond --project trial gates=true >/dev/null

t skill coordinator --project trial >"$tmp/trial.md"
t skill coordinator --project other >"$tmp/other.md"

for f in trial other; do
	grep -q '^## House rules (mod: double-diamond)$' "$tmp/$f.md" ||
		fail "$f: no Double diamond house rules"
	# The playbook only adds: tm's own policy is still there, unreplaced.
	grep -q '^## Replies$' "$tmp/$f.md" || fail "$f: default policy missing"
	! grep -q '^## Policy (mod:' "$tmp/$f.md" || fail "$f: a policy was replaced"
done
# The setting is per project: only trial has the gates section.
grep -q '^### The gates$' "$tmp/trial.md" || fail "trial: gates missing where set"
! grep -q '^### The gates$' "$tmp/other.md" || fail "other: gates reached a project that didn't set them"

for p in discover define develop deliver; do
	t task add "sync" --template "$p" --project trial >"$tmp/add.txt"
	want="$(echo "$p" | cut -c1 | tr a-z A-Z)$(echo "$p" | cut -c2-): sync"
	grep -q "$want" "$tmp/add.txt" || fail "template $p: $(cat "$tmp/add.txt")"
done

echo "ok    double-diamond: rules and templates reach the coordinator"
