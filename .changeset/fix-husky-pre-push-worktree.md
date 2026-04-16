---
---

Fix pre-push hook failure when running inside a git worktree

Git sets `GIT_DIR` / `GIT_WORK_TREE` to the worktree's gitdir when
invoking hooks from inside a linked worktree. Those variables break
`changeset status` — its internal `git` subprocesses read from the linked
gitdir rather than the worktree's tree and report "no changesets found"
even when a valid changeset exists. Unset both before calling
`changeset status` so push from a worktree is no longer rejected.

Downstream repos that copied this hook from the template (e.g. `lst-api`
PR #92) hit the same bug; the fix here is what those downstream copies
should track back to.
