/**
 * Compatibility re-export.
 *
 * The generic path/filesystem primitives now live in `@snailicid3/node-utils`. This shim preserves
 * `@snailicid3/config`'s existing import paths (`./utilities/path.js`) during the Phase 6 ownership migration. New code
 * should import these from `@snailicid3/node-utils` directly.
 */
export {
    doesFileExist,
    getDirname,
    getExt,
    getFilename,
    getFilePath,
    getFullPath,
    normalizePath,
    paths,
    resolveCwd,
} from '@snailicid3/node-utils'
export type { PathRoot } from '@snailicid3/node-utils'
