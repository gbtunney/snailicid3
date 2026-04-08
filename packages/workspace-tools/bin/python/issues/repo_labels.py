#!/usr/bin/env python3
"""Create repo labels — rewrite of scripts/issues/repo-labels.sh"""
import subprocess
import sys

LABELS = [
    # type labels
    ("type:bug",       "70cc53", "Something broken or incorrect"),
    ("type:feature",   "70cc53", "New capability"),
    ("type:task",      "70cc53", "General task or chore"),
    ("type:refactor",  "70cc53", "Code improvement without behaviour change"),
    ("type:docs",      "70cc53", "Documentation change"),
    ("type:chore",     "70cc53", "Maintenance"),
    ("type:idea",      "70cc53", "Exploratory or speculative"),
    # scope labels
    ("scope:workspace",       "6f42c1", "Workspace root / monorepo config"),
    ("scope:types",           "6f42c1", "@snailicid3/types"),
    ("scope:utils",           "6f42c1", "@snailicid3/utils"),
    ("scope:color",           "6f42c1", "@snailicid3/color"),
    ("scope:zod-helpers",     "6f42c1", "@snailicid3/zod-helpers"),
    ("scope:node-utils",      "6f42c1", "@snailicid3/node-utils"),
    ("scope:logger",          "6f42c1", "@snailicid3/logger"),
    ("scope:config",          "6f42c1", "@snailicid3/config"),
    ("scope:build-config",    "6f42c1", "@snailicid3/build-config"),
    ("scope:cli-app",         "6f42c1", "@snailicid3/cli-app"),
    ("scope:scaffold",        "6f42c1", "@snailicid3/scaffold"),
    ("scope:workspace-tools", "6f42c1", "@snailicid3/workspace-tools"),
    # category labels
    ("category:build",   "0e8a16", "Build system"),
    ("category:ci",      "0e8a16", "CI/CD"),
    ("category:dx",      "0e8a16", "Developer experience"),
    ("category:types",   "0e8a16", "Type system"),
    ("category:testing", "0e8a16", "Tests"),
    # utility labels
    ("needs-triage",  "fbca04", "Needs triage"),
    ("blocked",       "fbca04", "Blocked on something else"),
    ("good-first",    "fbca04", "Good first issue"),
]


def main() -> None:
    errors = 0
    for name, color, description in LABELS:
        result = subprocess.run(
            ["gh", "label", "create", name, "--color", color, "--description", description, "--force"],
            capture_output=True, text=True,
        )
        if result.returncode == 0:
            print(f"  created: {name}")
        else:
            print(f"  error: {name} — {result.stderr.strip()}", file=sys.stderr)
            errors += 1

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
