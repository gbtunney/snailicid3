<!-- @snailicid3:header:start -->

# @snailicid3/config

> Shared ESLint, Prettier, markdownlint, commitlint and TypeScript base configs

<!-- @snailicid3:header:end -->

## Installation

```sh
pnpm add @snailicid3/config
```

## Shell Completions

The shell helper can be called through pnpm:

```sh
pnpm exec snail-sh line "-|" "50%" bg-cyan
```

Bash:

```sh
source ./node_modules/@snailicid3/config/completions/snail-sh.bash
```

For completions while still running through pnpm, add a small wrapper:

```sh
snail-sh() { pnpm exec snail-sh "$@"; }
```

Zsh:

```sh
fpath=(./node_modules/@snailicid3/config/completions $fpath)
autoload -Uz compinit && compinit
```

The same wrapper works for zsh:

```sh
snail-sh() { pnpm exec snail-sh "$@"; }
```
