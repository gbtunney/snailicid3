#!/usr/bin/env python3
"""Environment diagnostics — rewrite of scripts/report/env-diagnostics.sh"""
import os
import platform
import subprocess
from datetime import datetime, timezone


def command_version(cmd: str, flag: str = "--version") -> str:
    try:
        out = subprocess.run([cmd, flag], capture_output=True, text=True)
        return out.stdout.strip().splitlines()[0] if out.stdout.strip() else "not installed"
    except FileNotFoundError:
        return "not installed"


def kv(key: str, value: str) -> None:
    print(f"  {key:<22} {value}")


def section(label: str) -> None:
    print(f"\n── {label} ──")


def main() -> None:
    section("Environment")
    kv("timestamp", datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    kv("cwd", os.getcwd())
    kv("os", platform.platform())
    kv("shell", os.environ.get("SHELL", "unknown"))

    section("Tool Versions")
    kv("node", command_version("node", "-v"))
    kv("pnpm", command_version("pnpm", "-v"))
    kv("git", command_version("git", "--version"))
    kv("gh", command_version("gh", "--version"))
    kv("python", platform.python_version())


if __name__ == "__main__":
    main()
