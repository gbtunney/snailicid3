# esbuild Catalina patch

This command installs the bundled Catalina-compatible Darwin x64 `esbuild` executable over the copy
in the consuming pnpm workspace.

Run it after dependencies are installed:

```sh
pnpm exec gbt-patch
```

The command safely does nothing on platforms other than Darwin x64 and when the optional
`@esbuild/darwin-x64` package is not installed. It discovers the installed package version instead
of pinning a pnpm store path. Set `GBT_PATCH_CWD` to patch a workspace other than the current
directory.
