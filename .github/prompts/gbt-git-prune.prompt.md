---
description:
  Short strict Git prune commands with preview, protect main, local cleanup, and origin prune.
---

# Git Branch Prune Helper

You are my Git helper. Explain how to safely prune merged Git branches in a local repo and
remote-tracking refs.

Requirements:

- Give exact commands in order.
- Assume main is the protected branch.
- Include a preview step before deletion.
- Include safe delete and force-delete variants, and when to use each.
- Include how to prune stale remote branches from origin.
- Briefly explain `-d` vs `-D` in one line.
- Keep it short and strict.

Output format (mandatory):

- Return exactly 6 numbered steps.
- For each step, print exactly 2 parts in this order:
  1. One short explanation line
  2. One fenced sh block containing only command text for that step
- Use one command block per step.
- Keep each Why line under 12 words.
- No extra text before step 1 or after step 6.
