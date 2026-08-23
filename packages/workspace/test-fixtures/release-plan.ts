import {
    createReleasePlan,
    type ReleasePackagePlanInput,
    type ReleasePlan,
} from './../src/core/release-plan.js'

const publicPackageNames = [
    '@snailicid3/build-config',
    '@snailicid3/cli-app',
    '@snailicid3/color',
    '@snailicid3/config',
    '@snailicid3/logger',
    '@snailicid3/node-utils',
    '@snailicid3/storybook-config',
    '@snailicid3/utils',
    '@snailicid3/workspace',
] as const

const packageInput = (
    name: string,
    registryState: 'exists' | 'missing',
    version = '0.1.0',
): ReleasePackagePlanInput => ({
    access: 'public',
    doctor: { artifact: 'valid', dependencyClosure: 'valid' },
    gitTag: { selected: false },
    intent: { source: 'none' },
    name,
    policy: {
        decision: 'held',
        reason: 'No publish operation selected',
    },
    private: false,
    registry: {
        distTags: { latest: version },
        registryUrl: 'https://registry.npmjs.org/',
        state: registryState,
    },
    version,
    versionState: { state: 'current' },
})

/** PR #232 observed two missing exact versions without authorizing publication. */
export const pullRequest232ReleasePlanFixture: ReleasePlan = createReleasePlan({
    packages: publicPackageNames.map((name) =>
        packageInput(
            name,
            name === '@snailicid3/workspace' ||
                name === '@snailicid3/storybook-config'
                ? 'missing'
                : 'exists',
        ),
    ),
})

/** PR #233 observed that every public exact version existed in npm. */
export const pullRequest233ReleasePlanFixture: ReleasePlan = createReleasePlan({
    packages: publicPackageNames.map((name) => packageInput(name, 'exists')),
})

/** PR #234 observed nine missing exact versions while keeping publish policy explicit. */
export const pullRequest234ReleasePlanFixture: ReleasePlan = createReleasePlan({
    packages: publicPackageNames.map((name) => ({
        ...packageInput(name, 'missing', '0.2.0'),
        intent: {
            bump: 'patch' as const,
            reason: 'Intentional or dependency-propagated Changesets version',
            source: 'changesets' as const,
        },
    })),
})
