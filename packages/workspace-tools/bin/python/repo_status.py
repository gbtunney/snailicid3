#!/usr/bin/env python3
"""Repo status report — rewrite of scripts/report/repo-status.sh"""
import subprocess
import sys


def run(cmd: list[str]) -> tuple[bool, str]:
    try:
        out = subprocess.run(cmd, capture_output=True, text=True)
        return out.returncode == 0, out.stdout.strip()
    except FileNotFoundError:
        return False, "not found"


def kv(key: str, value: str) -> None:
    print(f"  {key:<22} {value}")


def section(label: str) -> None:
    print(f"\n── {label} ──")


def main() -> None:
    ok, _ = run(["git", "rev-parse", "--is-inside-work-tree"])
    section("Repository")

    if not ok:
        kv("git", "not a repository")
        return

    _, branch = run(["git", "branch", "--show-current"])
    kv("branch", branch or "detached")

    _, origin = run(["git", "remote", "get-url", "origin"])
    kv("origin", origin or "none")

    clean_diff, _ = run(["git", "diff", "--quiet"])
    clean_cached, _ = run(["git", "diff", "--cached", "--quiet"])
    status = "clean" if clean_diff and clean_cached else "dirty"
    kv("REPO status", status)

    _, staged = run(["git", "diff", "--cached", "--name-only"])
    _, unstaged = run(["git", "diff", "--name-only"])
    _, untracked = run(["git", "ls-files", "--others", "--exclude-standard"])
    _, tracked = run(["git", "ls-files"])

    kv("total tracked files", str(len(tracked.splitlines()) if tracked else 0))
    kv("staged files", str(len(staged.splitlines()) if staged else 0))
    kv("unstaged files", str(len(unstaged.splitlines()) if unstaged else 0))
    kv("untracked files", str(len(untracked.splitlines()) if untracked else 0))

    ok_up, upstream = run(["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"])
    if ok_up and upstream:
        _, ahead_behind = run(["git", "rev-list", "--left-right", "--count", f"{upstream}...HEAD"])
        parts = ahead_behind.split()
        behind, ahead = (parts[0], parts[1]) if len(parts) == 2 else ("?", "?")
        kv("upstream", upstream)
        kv("ahead", ahead)
        kv("behind", behind)
    else:
        kv("upstream", "not set")

    _, last = run(["git", "log", "-1", "--pretty=format:%h %ad %s", "--date=iso"])
    kv("last commit", last or "none")

    if status == "dirty":
        section("Dirty File Preview")
        _, short = run(["git", "status", "--short"])
        lines = short.splitlines()[:20]
        print("\n".join(lines))


if __name__ == "__main__":
    main()
