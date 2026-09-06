import { fsTypedPath } from '@snailicid3/node-utils'
import path from 'node:path'

/**
 * One string leaf of an `exports` map, kept with enough context to be reported without re-walking the manifest.
 *
 * `fieldPath` is the exact path the value occupies in `package.json`, so a reader can go straight to the declaration
 * that produced a finding. `exportKey` and `conditions` describe the same leaf semantically, which is what routing
 * assertions care about; array position is deliberately absent from `conditions`, because a fallback index is a
 * position rather than a condition. It survives in `fieldPath`, where it belongs.
 */
export type DeclaredExportTarget = Readonly<{
    conditions: ReadonlyArray<string>
    exportKey: string
    fieldPath: string
    target: string
}>

/** A declared target outside the `exports` map, where the field itself is the whole address. */
export type DeclaredTarget = Readonly<{
    fieldPath: string
    target: string
}>

/**
 * An `exports` leaf that is neither a string target nor a `null` exclusion.
 *
 * `null` is a deliberate exclusion and so is not malformed; anything else — a number, a boolean — cannot route to a
 * file and is reported rather than dropped, which is what "validate every string leaf" requires of the leaves that are
 * not strings.
 */
export type MalformedExportLeaf = Readonly<{
    fieldPath: string
    typeName: string
}>

/**
 * What composing the shared filesystem schema over one declared target established.
 *
 * These are validation facts, not Doctor findings: the verdict says what is true of the path, and the caller decides
 * which diagnostic code and severity that deserves. Keeping the two apart is what lets `exports`, the legacy entry
 * fields and `bin` share one validator while keeping the different rules each of them is held to.
 */
export type TargetVerdict =
    | Readonly<{ detail: string; kind: 'missing' }>
    | Readonly<{ detail: string; kind: 'unmatchedWildcard' }>
    | Readonly<{ kind: 'escapesPackageRoot' }>
    | Readonly<{ kind: 'notRelativeSpecifier' }>
    | Readonly<{ kind: 'valid'; resolvedPath: string }>

export type ValidateTargetOptions = Readonly<{
    /**
     * Require the `./` prefix npm demands of an `exports` target.
     *
     * Off for `main`, `module`, `types` and `bin`, where a bare `dist/index.js` has always been legal and reporting it
     * would invent a rule npm does not have.
     */
    requireRelativeSpecifier: boolean
}>

type ExportLeaf = DeclaredExportTarget | MalformedExportLeaf

/** Filesystem entries an entry point may legitimately resolve to; a directory is not a module. */
const CONCRETE_TARGET_TYPES = ['file', 'symlink'] as const

/** Flatten the string leaves of an `exports` value, preserving both routing and manifest-path evidence. */
export function collectDeclaredExportTargets(
    exportsValue: unknown,
): ReadonlyArray<DeclaredExportTarget> {
    return collectExportLeaves(exportsValue).filter(isDeclaredExportTarget)
}

/** Flatten the `exports` leaves that cannot route anywhere, so they are reported rather than silently dropped. */
export function collectMalformedExportLeaves(
    exportsValue: unknown,
): ReadonlyArray<MalformedExportLeaf> {
    return collectExportLeaves(exportsValue).filter(
        (leaf): leaf is MalformedExportLeaf => !isDeclaredExportTarget(leaf),
    )
}

/** Render one declared target as diagnostic evidence: the exact manifest field path, then what it points at. */
export function formatTargetEvidence(
    target: DeclaredExportTarget | DeclaredTarget,
): string {
    return `package.json#${target.fieldPath} -> ${target.target}`
}

/**
 * Validate one declared target against the package tree using the shared filesystem schemas.
 *
 * The rules are composed in the order that keeps their findings distinct. Specifier shape and root containment are
 * decided on the declared string alone, before the filesystem is consulted at all: a target escaping the package root
 * is wrong even when the file it reaches happens to exist, and letting it fall through to an existence check would
 * report the wrong thing about it — or nothing. The shared schemas do not enforce containment (they resolve
 * `./../outside.js` happily), so this is Doctor's rule to apply, and applying it first is what makes it provable.
 *
 * Only then does the shared schema answer the filesystem question, under the one distinction npm itself draws: a
 * concrete target must be an existing file or symlink, while a wildcard target need only match something.
 */
export function validateDeclaredTarget(
    packageRoot: string,
    target: string,
    options: ValidateTargetOptions,
): TargetVerdict {
    if (options.requireRelativeSpecifier && !target.startsWith('./')) {
        return { kind: 'notRelativeSpecifier' }
    }

    if (!isInsidePackageRoot(packageRoot, target)) {
        return { kind: 'escapesPackageRoot' }
    }

    if (target.includes('*')) {
        const matched = fsTypedPath('glob', packageRoot, {
            exists: true,
        }).safeParse(toGlobPattern(target))

        return matched.success
            ? { kind: 'valid', resolvedPath: matched.data }
            : {
                  detail: firstIssueMessage(matched.error),
                  kind: 'unmatchedWildcard',
              }
    }

    const resolved = fsTypedPath(CONCRETE_TARGET_TYPES, packageRoot, {
        exists: true,
    }).safeParse(target)

    return resolved.success
        ? { kind: 'valid', resolvedPath: resolved.data }
        : { detail: firstIssueMessage(resolved.error), kind: 'missing' }
}

/** Walk an `exports` value once, yielding every leaf with the manifest path that addresses it. */
function collectExportLeaves(exportsValue: unknown): ReadonlyArray<ExportLeaf> {
    const leaves: Array<ExportLeaf> = []

    if (isJsonRecord(exportsValue)) {
        const entries = Object.entries(exportsValue)

        // A key beginning with `.` makes this a subpath map; otherwise the whole object is the root's condition set.
        if (entries.some(([key]) => key.startsWith('.'))) {
            for (const [exportKey, value] of entries) {
                visitExportValue(
                    value,
                    exportKey,
                    [],
                    `exports[${JSON.stringify(exportKey)}]`,
                    leaves,
                )
            }
            return leaves
        }
    }

    visitExportValue(exportsValue, '.', [], 'exports', leaves)
    return leaves
}

function firstIssueMessage(
    error: Readonly<{
        issues: ReadonlyArray<{ message: string }>
    }>,
): string {
    return error.issues[0]?.message ?? 'path validation failed'
}

function isDeclaredExportTarget(
    leaf: ExportLeaf,
): leaf is DeclaredExportTarget {
    return 'target' in leaf
}

/**
 * Whether a declared target stays inside the package once resolved.
 *
 * Decided on the declared string rather than on what is on disk, so `./../outside.js` is rejected identically whether
 * or not that file exists.
 */
function isInsidePackageRoot(packageRoot: string, target: string): boolean {
    const root = path.resolve(packageRoot)
    const relative = path.relative(root, path.resolve(root, target))

    return (
        relative !== '..' &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative)
    )
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Translate an npm export wildcard into an equivalent filesystem glob.
 *
 * The two syntaxes disagree on one point that decides whether a legitimate package is reported as broken: npm's `*`
 * matches any substring including `/`, while a glob `*` stops at a path separator. Passing the pattern through
 * unchanged would report `./dist/sub/*.js` as matching nothing when its only match is `dist/sub/deeper/x.js`, which is
 * a package npm resolves perfectly well.
 *
 * So each segment is widened to cover the nested case: a segment that is entirely `*` becomes a globstar, and a segment
 * carrying `*` among other characters gains a brace alternative letting it match at its own level or in any directory
 * below it. Both forms still match nothing when nothing is there, which is the case worth reporting.
 */
function toGlobPattern(target: string): string {
    return target
        .split('/')
        .map((segment) => {
            if (!segment.includes('*')) return segment
            return segment === '*' ? '**' : `{,**/}${segment}`
        })
        .join('/')
}

function visitExportValue(
    value: unknown,
    exportKey: string,
    conditions: ReadonlyArray<string>,
    fieldPath: string,
    leaves: Array<ExportLeaf>,
): void {
    if (typeof value === 'string') {
        leaves.push({ conditions, exportKey, fieldPath, target: value })
        return
    }

    // `null` excludes a subpath on purpose, so there is nothing here to validate or report.
    if (value === null) return

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            visitExportValue(
                item,
                exportKey,
                conditions,
                `${fieldPath}[${String(index)}]`,
                leaves,
            )
        })
        return
    }

    if (!isJsonRecord(value)) {
        leaves.push({ fieldPath, typeName: typeof value })
        return
    }

    for (const [condition, target] of Object.entries(value)) {
        visitExportValue(
            target,
            exportKey,
            [...conditions, condition],
            `${fieldPath}.${condition}`,
            leaves,
        )
    }
}
