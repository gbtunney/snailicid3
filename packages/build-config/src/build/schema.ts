import { z } from 'zod'

const SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*)?(?:\+[\dA-Za-z-]+(?:\.[\dA-Za-z-]+)*)?$/

export const BUILD_STRATEGY = ['bundle', 'none', 'transpile'] as const
export const buildStrategySchema = z.enum(BUILD_STRATEGY)

export type BuildStrategy = z.infer<typeof buildStrategySchema>
export const OUTPUT_KINDS = ['cjs', 'esm', 'iife', 'umd'] as const
export const outputKindSchema = z.array(z.enum(OUTPUT_KINDS))

/** A single output format kind (element of {@link OUTPUT_KINDS}). */
export type OutputKind = (typeof OUTPUT_KINDS)[number]
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
export const productSchema = z.enum(PRODUCT_KINDS)

export const RUNTIME_KINDS = ['browser', 'edge', 'node', 'universal'] as const
export const runtimeSchema = z.enum(RUNTIME_KINDS)

export const packageIdentitySchema = z.object({
    buildStrategy: z.enum(BUILD_STRATEGY).default('none'),
    product: z.enum(PRODUCT_KINDS).default('library'),
    runtime: z.enum(RUNTIME_KINDS).default('universal'),
})
/* return defineIdentity(
        parsedPackage.buildConfig.runtime,
        parsedPackage.buildConfig.product,
        parsedPackage.buildConfig.buildStrategy,
    )
        */
// defineIdentity('node', 'library', 'bundle')

export type PackageIdentity = z.infer<typeof packageIdentitySchema>
export type Product = z.infer<typeof productSchema>
export type Runtime = z.infer<typeof runtimeSchema>

export const packageJsonIdentitySchema = z.looseObject({
    buildConfig: packageIdentitySchema.optional(),
})

const REPO_TYPES = ['git', 'svn', 'hg', 'bzr'] as const
const LICENSES = ['MIT', 'ISC', 'GPL-3.0', 'Apache-2.0', 'UNLICENSED'] as const
export const basePackage = z.object({
    author: z.object({
        email: z.email(),
        name: z.string(),
    }),
    description: z.string(),
    license: z.enum(LICENSES).default('MIT'),
    main: z.string(),
    name: z
        .string()
        .regex(/^(@[\da-z~-][\d._a-z~-]*\/)?[\da-z~-][\d._a-z~-]*$/),
    repository: z.union([
        z.string().min(1),
        z.object({
            directory: z.string().optional(),
            type: z.enum(REPO_TYPES).default('git'),
            url: z.url(),
        }),
    ]),

    version: z.string().regex(SEMVER_REGEX, {
        message: 'Please enter a valid semver',
    }),
})

export const schemaRequiredScripts = z.object({
    scripts: z.object({
        'build:docs:nx': z
            .string()
            .default('nx run $npm_package_name:build:docs')
            .optional(),
        'build:nx': z.string().default('nx run $npm_package_name:build'),
        'clean:nx': z.string().default('nx run $npm_package_name:clean'),
        'test:nx': z.string().default('nx run $npm_package_name:test'),
    }),
})

export const pkgSchema = z.looseObject({
    ...basePackage.shape,
    buildConfig: packageIdentitySchema,
    scripts: schemaRequiredScripts,
})
