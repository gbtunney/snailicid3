# Change this version:
ESBUILD_VERSION=0.28.2

(
    cd /tmp
    rm -rf esbuild

    git clone --depth 1 --branch "v$ESBUILD_VERSION" \
        https://github.com/evanw/esbuild.git

    cd esbuild

    go build -o esbuild-darwin-x64 ./cmd/esbuild

    ./esbuild-darwin-x64 --version
)

# Create the versioned binary folder
mkdir -p \
    "packages/config/bin/esbuild-patch/binaries/$ESBUILD_VERSION"

# Copy the Catalina-compatible binary into it
cp /tmp/esbuild/esbuild-darwin-x64 \
    "packages/config/bin/esbuild-patch/binaries/$ESBUILD_VERSION/esbuild-darwin-x64"

# Make sure it is executable
chmod +x \
    "packages/config/bin/esbuild-patch/binaries/$ESBUILD_VERSION/esbuild-darwin-x64"

# Verify the bundled copy
"./packages/config/bin/esbuild-patch/binaries/$ESBUILD_VERSION/esbuild-darwin-x64" --version

# Apply the appropriate bundled binary to node_modules
pnpm exec gbt-patch
