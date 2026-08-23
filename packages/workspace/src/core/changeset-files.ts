import { parseChangesetFile } from '@changesets/parse'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/** Root-relative directory Changesets writes pending release files into. */
const CHANGESET_DIRECTORY = '.changeset/'

/**
 * Whether a repository-relative path is a changeset content file.
 *
 * Excludes the directory's own generated `README.md`, which carries no release frontmatter and would otherwise fail to
 * parse.
 */
export const isChangesetContentFile = (file: string): boolean =>
    file.startsWith(CHANGESET_DIRECTORY) &&
    file.endsWith('.md') &&
    path.basename(file) !== 'README.md'

/**
 * Package names a changeset file's frontmatter declares release intent for.
 *
 * A changeset's own path never lives inside the package it describes, so callers that classify scope by path alone
 * always miss it; its frontmatter is the authoritative source instead. Unreadable or malformed content resolves to no
 * names rather than throwing, matching how an unmatched path falls back to `root`.
 */
export const readChangesetPackageNames = (
    repoRoot: string,
    file: string,
): Array<string> => {
    try {
        const contents = readFileSync(path.resolve(repoRoot, file), 'utf8')
        return parseChangesetFile(contents).releases.map(
            (release) => release.name,
        )
    } catch {
        return []
    }
}
