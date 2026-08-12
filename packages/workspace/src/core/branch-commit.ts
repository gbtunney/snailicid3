import { type BranchPrefix } from './branch-state.js'

/**
 * Derive commit metadata from the branch name.
 *
 * The `changeset/<slug>` (or `release/<slug>`) branch _is_ the durable state: the commit type comes from the prefix and
 * the subject comes from the slug, so no hidden pending-message file is needed to "remember" what to commit. The scope
 * is resolved separately (by the normal scope mechanism) and passed in; an optional freeform message is appended after
 * the slug.
 *
 * Example: branch `changeset/wacky-walker` + scope `config` + append `adjust output` yields `changeset(config):
 * wacky-walker — adjust output`.
 */

const BRANCH_NAME = /^(changeset|release)\/(.+)$/

export type DerivedCommit = {
    /** The full `type(scope): subject` commit message. */
    message: string
    /** The subject line (slug, plus any appended message). */
    subject: string
    /** Commit type, taken from the branch prefix. */
    type: BranchPrefix
}

export type ParsedBranchName = {
    prefix: BranchPrefix
    slug: string
}

/** Split a `changeset/<slug>` or `release/<slug>` branch into its prefix and durable slug. */
export const parseBranchName = (
    branch: string,
): ParsedBranchName | undefined => {
    const match = BRANCH_NAME.exec(branch.trim())
    if (!match) return undefined

    const [, prefix, slug] = match
    const trimmedSlug = slug.trim()
    if (!trimmedSlug) return undefined

    return { prefix: prefix as BranchPrefix, slug: trimmedSlug }
}

/** True for a `changeset/*` or `release/*` branch. */
export const isWorkflowBranch = (branch: string): boolean =>
    parseBranchName(branch) !== undefined

/**
 * Build the commit message from the branch name, resolved scope, and an optional appended message. Returns `undefined`
 * for branches that are not `changeset/*` or `release/*`.
 */
export const deriveCommitFromBranch = (
    branch: string,
    options: { append?: string; scope: string },
): DerivedCommit | undefined => {
    const parsed = parseBranchName(branch)
    if (!parsed) return undefined

    const append = options.append?.trim()
    const subject = append ? `${parsed.slug} — ${append}` : parsed.slug

    return {
        message: `${parsed.prefix}(${options.scope}): ${subject}`,
        subject,
        type: parsed.prefix,
    }
}
