import { z } from 'zod'
import { readFileSync } from 'node:fs'

/**
 * Canonical package.json decoding for every package that needs to _read_ a manifest.
 *
 * This layer answers "what is this package called?", not "is this package correct?". It is deliberately lenient: a
 * manifest that npm accepts must parse here, because the consumers are a CLI banner and an app header, and neither
 * should crash on a sparse-but-valid manifest. Completeness and house-style checks are diagnostics and belong to
 * `@snailicid3/doctor`.
 */

/** npm package name, optionally scoped. */
export const packageNameSchema = z
    .string()
    .trim()
    .min(1)
    .max(214)
    .regex(
        /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/u,
        'Not a valid npm package name',
    )

/** Semver, accepted loosely enough to cover prerelease and build metadata. */
export const packageVersionSchema = z
    .string()
    .regex(
        /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/u,
        'Not a valid semver version',
    )

/** `packageManager` as written by corepack, e.g. `pnpm@10.30.2` or `npm@11.0.0+sha512...`. */
export const packageManagerFieldSchema = z
    .string()
    .regex(/^[a-z]+@\S+$/u, 'Not a valid packageManager field')

const personSchema = z.union([
    z.string(),
    z.looseObject({
        email: z.string().optional(),
        name: z.string().optional(),
        url: z.string().optional(),
    }),
])

const repositorySchema = z.union([
    z.string(),
    z.looseObject({
        directory: z.string().optional(),
        type: z.string().optional(),
        url: z.string().optional(),
    }),
])

/**
 * The fields needed to identify and describe a package.
 *
 * Every field is optional. This schema validates _shape_ — a `name`, if present, must be a name npm would accept — and
 * leaves _presence_ to the caller, because presence is policy and policy lives with the consumer. Doctor depends on
 * this directly: it reports a missing name as the finding `MANIFEST_NAME_MISSING`, which it could not do if parsing
 * rejected the manifest first. Equally, `resolvePackageManager` reads one field from a root manifest and should not
 * care about identity at all.
 */
export const packageIdentitySchema = z.looseObject({
    author: personSchema.optional(),
    description: z.string().optional(),
    license: z.string().optional(),
    name: packageNameSchema.optional(),
    packageManager: packageManagerFieldSchema.optional(),
    private: z.boolean().optional(),
    repository: repositorySchema.optional(),
    type: z.enum(['commonjs', 'module']).optional(),
    version: packageVersionSchema.optional(),
})

export type PackageIdentity = z.output<typeof packageIdentitySchema>

/** Decode a JSON document string, then apply a schema to the result. */
export const jsonTextSchema = z.string().transform((value, context) => {
    try {
        return JSON.parse(value) as unknown
    } catch (error) {
        context.addIssue({
            code: 'custom',
            message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        })
        return z.NEVER
    }
})

/** A manifest read that distinguishes "absent", "unreadable" and "invalid" from a valid result. */
export type PackageManifestResult =
    | { data: PackageIdentity; success: true }
    | {
          error: string
          reason: 'invalid' | 'missing' | 'unreadable'
          success: false
      }

/**
 * Read and decode a package.json without throwing.
 *
 * The three failure reasons are kept distinct because callers treat them differently: a missing manifest is often
 * normal, while malformed JSON is a defect that should not be silently indistinguishable from absence.
 */
export function readPackageManifest(
    manifestPath: string,
): PackageManifestResult {
    let contents: string

    try {
        contents = readFileSync(manifestPath, 'utf8')
    } catch (error) {
        const isMissing =
            error instanceof Error &&
            (error as NodeJS.ErrnoException).code === 'ENOENT'

        return {
            error: error instanceof Error ? error.message : String(error),
            reason: isMissing ? 'missing' : 'unreadable',
            success: false,
        }
    }

    const parsed = jsonTextSchema
        .pipe(packageIdentitySchema)
        .safeParse(contents)

    return parsed.success
        ? { data: parsed.data, success: true }
        : {
              error: z.prettifyError(parsed.error),
              reason: 'invalid',
              success: false,
          }
}
