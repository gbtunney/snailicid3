---
title: gbt-template-sync
category: template-management
summary: |
  Provides a quick action menu and workflow for auditing and syncing files between your current repository and a template repository. Includes options to compare file statuses, pull one-off replacements, sync all files, add the template remote, and show status label definitions.
description: |
  This prompt offers a guided menu and step-by-step instructions for syncing and auditing files between your repository and a template repository, making it easy to keep your project up-to-date or customized as needed.
---

# Template Sync

This skill provides a reusable workflow for auditing and syncing files between your current repository and a
template repository.

---

## Quick Action Menu

**What template sync action do you want to perform?**

- Compare file statuses — Check which files are up-to-date, changed in the template, changed locally, only
  exist on one side, or have diverged.
- Pull one-off file replacement — Replace a specific file in your repo with the version from the template.
- Sync all files — Overwrite all files in your repo with the template's versions.
- Add template remote — Add the template repository as a remote to your local git config.
- Show status label definitions — Display the meaning of each status label used in the comparison.

---

## Description

Use this skill to:

- Compare the status of files between your repository and a template repository.
- Identify files that are up-to-date, changed in the template, changed locally, only present on one side, or
  diverged.
- Pull one-off file replacements from the template.
- Automate the process of syncing files with the template.

## Workflow

### 1. Compare File Status

Run the following commands to compare the status of files grouped by status:

```sh
git fetch template
base=$(git merge-base HEAD template/main)

# Compare file statuses across both trees
{
  git ls-files
  git ls-tree -r --name-only template/main
} | sort -u \
  | while IFS= read -r file; do
    local_blob=$(git rev-parse --verify -q "HEAD:$file")
    template_blob=$(git rev-parse --verify -q "template/main:$file")
    base_blob=$(git rev-parse --verify -q "$base:$file")

    if [ -z "$local_blob" ] && [ -n "$template_blob" ]; then
      echo "5|🟣 TEMPLATE ONLY|$file"
    elif [ -n "$local_blob" ] && [ -z "$template_blob" ]; then
      echo "6|⚪ LOCAL ONLY|$file"
    elif [ "$local_blob" = "$template_blob" ]; then
      echo "1|🟢 UP TO DATE|$file"
    elif [ "$local_blob" = "$base_blob" ] && [ "$template_blob" != "$base_blob" ]; then
      echo "2|🔵 TEMPLATE CHANGED|$file"
    elif [ "$template_blob" = "$base_blob" ] && [ "$local_blob" != "$base_blob" ]; then
      echo "3|🟡 LOCAL MODIFIED|$file"
    else
      echo "4|🔴 DIVERGED|$file"
    fi
  done | sort -t'|' -k1,1n -k2,2 -k3,3 | cut -d'|' -f2-
```

Optional alternative output styles:

```sh
# Raw file order
git fetch template
base=$(git merge-base HEAD template/main)

{
  git ls-files
  git ls-tree -r --name-only template/main
} | sort -u \
  | while IFS= read -r file; do
    local_blob=$(git rev-parse --verify -q "HEAD:$file")
    template_blob=$(git rev-parse --verify -q "template/main:$file")
    base_blob=$(git rev-parse --verify -q "$base:$file")

    if [ -z "$local_blob" ] && [ -n "$template_blob" ]; then
      echo "🟣 TEMPLATE ONLY|$file"
    elif [ -n "$local_blob" ] && [ -z "$template_blob" ]; then
      echo "⚪ LOCAL ONLY|$file"
    elif [ "$local_blob" = "$template_blob" ]; then
      echo "🟢 UP TO DATE|$file"
    elif [ "$local_blob" = "$base_blob" ] && [ "$template_blob" != "$base_blob" ]; then
      echo "🔵 TEMPLATE CHANGED|$file"
    elif [ "$template_blob" = "$base_blob" ] && [ "$local_blob" != "$base_blob" ]; then
      echo "🟡 LOCAL MODIFIED|$file"
    else
      echo "🔴 DIVERGED|$file"
    fi
  done
```

```sh
# Alphabetical by status label
git fetch template
base=$(git merge-base HEAD template/main)

{
  git ls-files
  git ls-tree -r --name-only template/main
} | sort -u \
  | while IFS= read -r file; do
    local_blob=$(git rev-parse --verify -q "HEAD:$file")
    template_blob=$(git rev-parse --verify -q "template/main:$file")
    base_blob=$(git rev-parse --verify -q "$base:$file")

    if [ -z "$local_blob" ] && [ -n "$template_blob" ]; then
      echo "🟣 TEMPLATE ONLY|$file"
    elif [ -n "$local_blob" ] && [ -z "$template_blob" ]; then
      echo "⚪ LOCAL ONLY|$file"
    elif [ "$local_blob" = "$template_blob" ]; then
      echo "🟢 UP TO DATE|$file"
    elif [ "$local_blob" = "$base_blob" ] && [ "$template_blob" != "$base_blob" ]; then
      echo "🔵 TEMPLATE CHANGED|$file"
    elif [ "$template_blob" = "$base_blob" ] && [ "$local_blob" != "$base_blob" ]; then
      echo "🟡 LOCAL MODIFIED|$file"
    else
      echo "🔴 DIVERGED|$file"
    fi
  done | sort
```

### 2. Pull One-Off File Replacement

To replace a specific file with the version from the template:

```sh
git fetch template
git checkout template/main -- path/to/file
```

### 3. Sync All Files

To sync all files from the template:

```sh
git fetch template
git checkout template/main -- .
```

## Status Labels

- **🟢 UP TO DATE**: File is identical in both repositories.
- **🔵 TEMPLATE CHANGED**: The template changed and your repo still matches the shared base version.
- **🟡 LOCAL MODIFIED**: Your repo changed the file locally and the template did not.
- **🔴 DIVERGED**: Both local and template versions have changed.
- **🟣 TEMPLATE ONLY**: The file exists in the template but not in your repo.
- **⚪ LOCAL ONLY**: The file exists in your repo but not in the template.

## Notes

- Ensure you have added the template repository as a remote:
  ```sh
  git remote add template <template-repo-url>
  ```
- Replace `<template-repo-url>` with the actual URL of the template repository.

## Use Cases

- Keeping your repository aligned with a shared template.
- Pulling updates from a template without overwriting local customizations.
- Auditing file differences between repositories.

## Commands

- Compare file statuses: See **Compare File Status** above.
- Pull one-off file replacement: See **Pull One-Off File Replacement** above.
- Sync all files: See **Sync All Files** above.
