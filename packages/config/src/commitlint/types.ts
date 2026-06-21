import config_conventional from '@commitlint/config-conventional'
import type { KeyAsString, LiteralUnion } from 'type-fest'

/** These are my custom types. */
export type CommitType =
    | 'changeset'
    | 'release'
    | Exclude<ConventionalCommitType, 'ci' | 'perf' | 'style'>

export type ConventionalCommitType = KeyAsString<
    typeof config_conventional.prompt.questions.type.enum
>

/** Returns all conventional commit types except those in `exclude`. */
export const filterCommitTypes = (
    exclude: ReadonlyArray<ConventionalCommitType>,
): Array<ConventionalCommitType> =>
    (
        Object.keys(
            config_conventional.prompt.questions.type.enum,
        ) as Array<ConventionalCommitType>
    ).filter((commitType) => !exclude.includes(commitType))

export const COMMIT_TYPES = [
    ...filterCommitTypes(['ci', 'perf', 'style']),
    'changeset',
    'release',
] satisfies ReadonlyArray<LiteralUnion<CommitType, string>>
