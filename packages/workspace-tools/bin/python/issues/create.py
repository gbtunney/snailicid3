#!/usr/bin/env python3
"""Create a GitHub issue — rewrite of scripts/issues/create.sh"""
import argparse
import subprocess
import sys

TYPES = ["bug", "feature", "task", "refactor", "docs", "chore", "idea"]
SCOPES = ["workspace", "types", "utils", "color", "zod-helpers", "node-utils",
          "logger", "config", "build-config", "cli-app", "scaffold", "workspace-tools"]


def gh(*args: str) -> tuple[bool, str]:
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    return result.returncode == 0, result.stdout.strip() or result.stderr.strip()


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a GitHub issue")
    parser.add_argument("--title", required=True)
    parser.add_argument("--type", required=True, choices=TYPES)
    parser.add_argument("--scope", required=True, choices=SCOPES)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--requirements", default="")
    parser.add_argument("--questions", default="")
    parser.add_argument("--notes", default="")
    args = parser.parse_args()

    labels = [f"type:{args.type}", f"scope:{args.scope}"]
    body_parts = [f"## Summary\n{args.summary}"]
    if args.requirements:
        body_parts.append(f"## Requirements\n{args.requirements}")
    if args.questions:
        body_parts.append(f"## Questions\n{args.questions}")
    if args.notes:
        body_parts.append(f"## Notes\n{args.notes}")

    body = "\n\n".join(body_parts)
    gh_args = ["issue", "create", "--title", args.title, "--body", body]
    for label in labels:
        gh_args += ["--label", label]

    ok, out = gh(*gh_args)
    if ok:
        print(f"Created: {out}")
    else:
        print(f"Error: {out}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
