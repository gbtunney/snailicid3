#!/usr/bin/env python3
"""Delete all issues and labels — rewrite of scripts/issues/delete-all.sh"""
import subprocess
import sys


def gh(*args: str) -> tuple[bool, str]:
    result = subprocess.run(["gh", *args], capture_output=True, text=True)
    return result.returncode == 0, result.stdout.strip() or result.stderr.strip()


def main() -> None:
    confirm = input("Delete ALL issues and labels? This cannot be undone. [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        sys.exit(0)

    ok, issues = gh("issue", "list", "--json", "number", "--jq", ".[].number", "--limit", "200")
    if ok and issues:
        for num in issues.splitlines():
            ok2, out = gh("issue", "delete", num.strip(), "--yes")
            print(f"  deleted issue #{num.strip()}: {'ok' if ok2 else out}")

    ok, labels = gh("label", "list", "--json", "name", "--jq", ".[].name", "--limit", "200")
    if ok and labels:
        for name in labels.splitlines():
            ok2, out = gh("label", "delete", name.strip(), "--yes")
            print(f"  deleted label {name.strip()}: {'ok' if ok2 else out}")


if __name__ == "__main__":
    main()
