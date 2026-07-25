---
description: Select recent GitHub repositories interactively, clone them into a workbench, and verify access
agent: agent
tools:
  - terminal
---

# GitHub Repository Workbench Setup

You are operating inside a GitHub Codespace using Zsh.

## User and Workspace

GitHub username:

`gbtunney`

Workbench directory:

`/workspaces/repo-workbench/repos`

## Goal

Complete this workflow in order:

1. Verify personal GitHub CLI authentication.
2. Ask how many recently pushed repositories to retrieve.
3. Present those repositories in an interactive multi-select picker.
4. Let me toggle the repositories I want.
5. Show the final selection and ask for approval.
6. Clone the approved repositories.
7. Verify fetch access.
8. Optionally perform a safe temporary-branch push test after separate approval.

# Operating Rules

- Use terminal tools instead of merely printing commands.
- Prefer interactive agent UI controls and dynamic terminal pickers over plain-text numbered responses.
- Never display authentication-token values.
- Do not modify, commit to, merge into, reset, rebase, or push to `main`.
- Do not overwrite existing repository directories.
- Do not install dependencies.
- Do not make source-code changes.
- Stop at each required approval point.
- The shell is Zsh.
- GitHub CLI commands must ignore restricted Codespaces environment tokens by using:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh ...
```

# Phase 1: Check GitHub Authentication

## Check Environment Tokens

Run:

```zsh
[[ -n "$GITHUB_TOKEN" ]] && echo "GITHUB_TOKEN is set" || echo "GITHUB_TOKEN is not set"
[[ -n "$GH_TOKEN" ]] && echo "GH_TOKEN is set" || echo "GH_TOKEN is not set"
```

Do not print the values of either token.

## Check the Saved Personal Login

Run:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh auth status
```

If no saved personal login exists, stop and tell me to run:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh auth login
```

Tell me to choose:

1. GitHub.com
2. HTTPS
3. Login with a web browser

After browser authorization is complete, repeat the authentication check.

## Verify the Account

Run:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh api user --jq '.login'
```

Confirm that the authenticated username is exactly:

`gbtunney`

## Verify Private Repository Access

Run:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh repo view gbtunney/gbt-schema-form \
  --json nameWithOwner,visibility,viewerPermission
```

If a saved login exists but its authorization is expired or insufficient, tell me to run:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh auth refresh -h github.com -s repo
```

Do not attempt to refresh the Codespaces-provided `GITHUB_TOKEN`.

# Phase 2: Ask for the Repository Count

Ask:

> How many of your most recently pushed repositories should I list?

Wait for my answer.

Do not choose a number automatically.

# Phase 3: Retrieve Recent Repositories

Use my answer as `COUNT`.

Retrieve repositories owned by `gbtunney`.

Include:

- Public repositories
- Private repositories
- Forks

Exclude:

- Archived repositories

Sort by `pushedAt`, newest first.

Use:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh repo list gbtunney \
  --limit 100 \
  --no-archived \
  --json nameWithOwner,pushedAt,visibility,description,primaryLanguage,isFork,isArchived
```

Limit the sorted results to `COUNT`.

# Phase 4: Show an Interactive Repository Picker

## Preferred Selection UI

Do not ask me to type repository numbers manually unless an interactive picker is unavailable.

Use a shell script and the available agent or terminal interaction UI to present a dynamic multi-select checklist.

Each option should show:

- Repository name
- Public or private visibility
- Last pushed date
- Primary language, when available
- Whether it is already cloned
- A short description, when available

Allow me to toggle multiple repositories.

Return the selected repository names to the agent.

## Fallback Selection UI

Only if an interactive multi-select picker is unavailable, display a numbered list and accept:

- `all`
- `1, 3, 5`
- `1-4`
- `all except 2 and 6`
- `refresh`
- `cancel`

# Phase 5: Confirm the Selection

After selection, display a checklist-style summary:

```text
[x] repository-one
[x] repository-two
[ ] repository-three
```

Ask:

> Clone the checked repositories? Reply `approve`, `change`, or `cancel`.

Do not clone anything unless I reply `approve`.

If I reply `change`, reopen the interactive picker or fallback list.

# Phase 6: Prepare the Workbench

After approval, run:

```zsh
mkdir -p /workspaces/repo-workbench/repos
```

Each repository should be placed at:

```text
/workspaces/repo-workbench/repos/REPOSITORY_NAME
```

# Phase 7: Verify Access Before Cloning

For each selected repository, run:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh repo view OWNER/REPOSITORY \
  --json nameWithOwner,visibility,defaultBranchRef,viewerPermission,url
```

Record:

- Visibility
- Default branch
- Viewer permission
- Repository URL

# Phase 8: Clone or Inspect Each Repository

## New Repository

If the target directory does not exist, clone with:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh repo clone \
  OWNER/REPOSITORY \
  /workspaces/repo-workbench/repos/REPOSITORY_NAME
```

## Existing Git Repository

If the directory already contains `.git`:

- Do not overwrite it.
- Report that it already exists.
- Run:

```zsh
git -C LOCAL_PATH status --short --branch
git -C LOCAL_PATH remote -v
git -C LOCAL_PATH fetch origin --prune
```

## Conflicting Directory

If the directory exists but is not a Git repository:

- Report the conflict.
- Do not delete or replace it.
- Skip that repository.

# Phase 9: Verify Fetch and Working Tree Status

For every successfully cloned or existing repository, run:

```zsh
git -C LOCAL_PATH remote -v
git -C LOCAL_PATH branch --show-current
git -C LOCAL_PATH status --short --branch
git -C LOCAL_PATH fetch origin --prune
```

Record:

- Current branch
- Working tree status
- Remote URL
- Fetch result

Retrieve GitHub permission with:

```zsh
env -u GITHUB_TOKEN -u GH_TOKEN gh repo view OWNER/REPOSITORY \
  --json viewerPermission \
  --jq '.viewerPermission'
```

Treat these as likely write access:

- `ADMIN`
- `MAINTAIN`
- `WRITE`

# Phase 10: Ask Before Push Testing

Display a table containing:

- Repository
- Clone status
- Current branch
- Working tree status
- Fetch status
- GitHub permission
- Push test status

Then ask:

> Perform a safe temporary-branch push test on repositories reporting write access?

Provide an interactive multi-select picker when available.

Fallback responses may include:

- `approve all`
- `skip`
- Repository numbers
- Repository names

Do not perform any push test without separate approval.

# Phase 11: Perform a Safe Push Test

For each approved repository, create a unique remote branch name:

```zsh
TEST_BRANCH="copilot/push-access-test-$(date -u +%Y%m%d-%H%M%S)"
```

Do not switch local branches.

Do not create a commit.

Push the currently checked-out commit to the temporary remote branch:

```zsh
git -C LOCAL_PATH push origin "HEAD:refs/heads/$TEST_BRANCH"
```

## If the Push Succeeds

1. Record that push access works.
2. Record the temporary branch name.
3. Delete only that temporary remote branch:

```zsh
git -C LOCAL_PATH push origin --delete "$TEST_BRANCH"
```

4. Record whether cleanup succeeded.

## If the Push Fails

- Do not force-push.
- Do not alter the remote.
- Do not retry repeatedly.
- Preserve the repository state.
- Show the useful portion of the error.
- Explain whether the likely cause is authentication, repository permission, branch protection, or remote configuration.

# Phase 12: Create a Workbench Manifest

Create or update:

```text
/workspaces/repo-workbench/repos.json
```

Include, for every selected repository:

- Repository name
- Full repository name
- Local path
- Visibility
- Default branch
- Current branch
- Remote URL
- Fetch status
- GitHub permission
- Push-test result
- Temporary-branch cleanup result

Do not include secrets or token values.

# Final Report

Display a compact table containing:

- Repository
- Local path
- Cloned or already present
- Current branch
- Clean or uncommitted changes
- Fetch access
- GitHub permission
- Push test result
- Temporary branch cleanup
- Any problem requiring attention

Then summarize:

- Number selected
- Number cloned
- Number already present
- Number able to fetch
- Number with confirmed push access
- Repositories that failed or were skipped

Do not begin code updates.

Stop after the workbench and access checks are complete.
