---
deck: Git — exam tickets
topic: programming
tags: [git, exam]
---

Q: Explain the difference between `git merge` and `git rebase`, and when to use each.
A: Both integrate commits from one branch into another. **Merge** creates a new merge commit that ties the two histories together, preserving the exact history. **Rebase** replays your commits on top of the target branch, producing a linear history but rewriting commit hashes.

::takeaway Rule of thumb
Merge to preserve shared history; rebase to keep a private branch linear — never rebase commits that others have already pulled.

---

Q: What is a "detached HEAD" state, how do you enter it, and why does it matter?
A: HEAD normally points to a branch. In a **detached HEAD**, it points directly at a commit instead. You enter it by checking out a commit hash or tag (`git checkout <sha>`). New commits made here belong to no branch and are lost once you check out something else — unless you create a branch first.

::warn Common mistake
Committing work in a detached HEAD and then switching branches — the commits become unreachable. Run `git switch -c <name>` before moving away.

---

Q: Describe what `git rebase -i` (interactive rebase) lets you do. List the main actions.
A: It opens an editor to rewrite a series of commits before replaying them.

::cascade
pick | keep the commit as-is | edit list
reword | change the commit message | then
squash / fixup | fold a commit into the previous one | then
drop | delete the commit entirely

---

Q: What is the difference between `git fetch` and `git pull`?
A: `git fetch` downloads new objects and updates remote-tracking branches but does **not** change your working branch. `git pull` is `git fetch` followed by a merge (or rebase) into your current branch.
