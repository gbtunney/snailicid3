export const SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*)?(?:\+[\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*)?$/

export const PACKAGE_NAME_REGEX =
    /^(@[\da-z~-][\d._a-z~-]*\/)?[\da-z~-][\d._a-z~-]*$/
export const SLUG_LIKE_REGEX = /^[\da-z]+(?:[._-][\da-z]+)*$/

export const BUILD_STRATEGY = ['bundle', 'none', 'transpile'] as const
export const OUTPUT_KINDS = ['ts', 'esm', 'cjs', 'iife', 'umd'] as const
export const RUNTIME_KINDS = ['browser', 'edge', 'node', 'universal'] as const

export const LOG_LEVEL = ['warn', 'error', 'info', 'silent'] as const
/**
 * This is the stupid 'module/commonjs/types' thing that npm uses. will almost alwsys be set to module but is required
 * so shud validate.
 */
export const PACKAGE_MODULE_TYPES = ['module', 'commonjs', 'types']
export const PRODUCT_KINDS = [
    'build_tool',
    'cli',
    'config',
    'library',
    'plugin',
    'script',
    'server_app',
    'web_app',
    'worker',
] as const

export const REPO_TYPES = ['git', 'svn', 'hg', 'bzr'] as const
export const LICENSES = [
    'MIT',
    'ISC',
    'GPL-3.0',
    'Apache-2.0',
    'UNLICENSED',
] as const

export const ECMA_SCRIPT_TARGET = [
    'es2015',
    'es2016',
    'es2017',
    'es2018',
    'es2019',
    'es2020',
    'es2021',
    'es2022',
    'es2023',
    'es2024',
    'es2025',
    'es2026',
    'esnext',
] as const

export const BROWSER_ENGINES = [
    'chrome',
    'edge',
    'firefox',
    'safari',
    'ios',
    'opera',
    'ie',
    'samsung',
] as const
export const RUNTIME_ENGINES = ['node', 'deno', 'hermes', 'rhino'] as const

export const ENTRY_KEY_DEFAULTS = ['*', '.', './', 'index'] as const

export const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts'] as const
