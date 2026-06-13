import config_conventional from '@commitlint/config-conventional'
import type { UserConfig as CommitlintUserConfig } from '@commitlint/types'
import type { LiteralUnion,ArrayValues,DistributedOmit,MergeExclusive,KeyAsString,Merge} from 'type-fest'
import {
    workspaceScopes,
    workspaceScopesCsv,
    type WorkspaceScopesOptions,
} from './workspace.scopes.js'
import {
    type ConfigToolApi,
    type IdentityDefineConfig,
    defineConfig,
} from '../core/index.js'

export type ConventionalCommitType =
    KeyAsString< typeof config_conventional.prompt.questions.type.enum>

   /** These are my custom types.  */ 
    export type CommitType  =Exclude<ConventionalCommitType,"ci"|"perf"> | ("changeset" | "release")

/** Returns all conventional commit types except those in `exclude`. */
 const filterCommitTypes = (
    exclude: ReadonlyArray<ConventionalCommitType>,
): Array<ConventionalCommitType> =>
    (Object.keys(
        config_conventional.prompt.questions.type.enum,
    ) as Array<ConventionalCommitType>).filter(
        (commitType) => !exclude.includes(commitType),
    )

export const COMMIT_TYPES = [
    ... filterCommitTypes(['ci', 'perf']),
    'changeset',
    'release',
] satisfies ReadonlyArray<LiteralUnion<CommitType, string>>
