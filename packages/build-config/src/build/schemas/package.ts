import z from 'zod'
import {
    LICENSES,
    PACKAGE_MODULE_TYPES,
    PACKAGE_NAME_REGEX,
    REPO_TYPES,
    SEMVER_REGEX,
} from './constants.js'

export const schemaRequiredScripts = z.object({
    'build:docs:nx': z
        .string()
        .default('nx run $npm_package_name:build:docs')
        .optional(),
    'build:nx': z.string().default('nx run $npm_package_name:build'),
    'clean:nx': z.string().default('nx run $npm_package_name:clean'),
    'test:nx': z.string().default('nx run $npm_package_name:test'),
})

const test: typeof REPO_TYPES = REPO_TYPES

export const schemaBasePackage = z.looseObject({
    author: z.object({
        email: z.email(),
        name: z.string(),
    }),
    description: z.string(),
    license: z.enum(LICENSES).default('MIT'),
    //  Main: z.string(),
    name: z.string().regex(PACKAGE_NAME_REGEX),
    private: z.boolean(),
    repository: z.union([
        z.string().min(1),
        z.object({
            directory: z.string().optional(),
            type: z.enum(REPO_TYPES).default('git'),
            url: z.url(),
        }),
    ]),
    type: z.enum(PACKAGE_MODULE_TYPES),
    version: z.string().regex(SEMVER_REGEX, {
        message: 'Please enter a valid semver',
    }),
})

export function definePackageJson<
    const Type extends z.input<typeof schemaPackageMetaBanner>,
>(packageJson: Type): Type {
    return packageJson
}

export function parsePackage(pkg: unknown): z.output<typeof schemaBasePackage> {
    return schemaBasePackage.parse(pkg)
}

//Stripped down to just the required meta ffieldd.
export const schemaPackageMetaBanner = z.object({
    ...schemaBasePackage.pick({
        author: true,
        description: true,
        license: true,
        name: true,
        repository: true,
        version: true,
    }).shape,
})
export type BannerPackageMeta = z.infer<typeof schemaPackageMetaBanner>

const licenseDchem = z.enum(LICENSES).default('MIT')
