#!/usr/bin/env python3
"""Seed example issues — rewrite of scripts/issues/seed-issues.sh"""
import subprocess
import sys
from pathlib import Path

CREATE = Path(__file__).parent / "create.py"

ISSUES = [
    {
        "title": "Populate @snailicid3/types src from g-library",
        "type": "task",
        "scope": "types",
        "summary": "Copy types/ and typeguard/ from snailicide-monorepo g-library into the new package.",
    },
    {
        "title": "Populate @snailicid3/utils src from g-library",
        "type": "task",
        "scope": "utils",
        "summary": "Copy string, regexp, number, object, date modules and add universal fmt.ts.",
    },
    {
        "title": "Populate @snailicid3/logger src from build-config",
        "type": "task",
        "scope": "logger",
        "summary": "Copy logger.ts and utilities (chalk, numeric, string) from old build-config.",
    },
]


def main() -> None:
    for issue in ISSUES:
        args = [
            sys.executable, str(CREATE),
            "--title", issue["title"],
            "--type", issue["type"],
            "--scope", issue["scope"],
            "--summary", issue["summary"],
        ]
        result = subprocess.run(args, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"  created: {issue['title']}")
        else:
            print(f"  error: {result.stderr.strip()}", file=sys.stderr)


if __name__ == "__main__":
    main()
