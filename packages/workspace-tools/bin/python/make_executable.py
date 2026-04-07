#!/usr/bin/env python3
"""Make shell scripts executable — rewrite of scripts/lib/sh-make-executable.sh"""
import os
import stat
import sys
from pathlib import Path


def make_executable(path: Path) -> None:
    before = oct(path.stat().st_mode)
    path.chmod(path.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    after = oct(path.stat().st_mode)
    print(f"  {path}  {before} → {after}")


def process(target: str) -> int:
    p = Path(target)
    errors = 0

    if p.is_file():
        make_executable(p)
    elif p.is_dir():
        scripts = list(p.glob("*.sh"))
        if not scripts:
            print(f"  no .sh files found in {p}", file=sys.stderr)
            errors += 1
        for f in scripts:
            make_executable(f)
    else:
        # treat as glob
        import glob as _glob
        matches = _glob.glob(target)
        if not matches:
            print(f"  no matches for pattern: {target}", file=sys.stderr)
            errors += 1
        for m in matches:
            make_executable(Path(m))

    return errors


def main() -> None:
    args = sys.argv[1:]
    if not args or args[0] in ("-h", "--help"):
        print("Usage: make_executable.py <file|dir|glob> [...]")
        print("  Quote glob patterns: make_executable.py './scripts/**/*.sh'")
        sys.exit(0)

    total_errors = sum(process(a) for a in args)
    if total_errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
