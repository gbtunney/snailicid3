Your feature branch
    → PR to main
    → pr-main CI: build + test + check (no docs needed)
    → merge

Push lands on main
    → release.yml runs
    → sees .changeset/*.md files
    → changesets/action creates a version PR automatically
      Branch name: changesets/gj2k4-version-packages (auto-named)
      Content: bumped package.json versions + CHANGELOG updates

That version PR
    → pr-changesets-version CI runs
    → build + test + docs:build + require_clean_repo
    → if docs:build generated new/changed files → repo is dirty → CI FAILS ← intentional

You run dispatch-build-docs on the changesets/... branch
    → builds docs, commits them to that branch
    → CI reruns → clean → green

Merge the version PR
    → release.yml runs again
    → no changeset files left (consumed)
    → commit message starts with “chore(release):”
    → publishes to npm + creates GitHub tags/releases
