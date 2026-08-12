/**
 * Compatibility re-export.
 *
 * The generic JSON value helpers and JSON file IO now live in `@snailicid3/node-utils`. This shim preserves
 * `@snailicid3/config`'s existing import paths (`./utilities/json.js`) during the Phase 6A ownership migration. New
 * code should import these from `@snailicid3/node-utils` directly.
 */
export {
    deepMerge,
    isJsonArray,
    isJsonObject,
    isJsonPrimitive,
    isJsonValue,
    isPlainObject,
    json,
} from '@snailicid3/node-utils'
export type {
    Json,
    JSONExportConfig,
    JSONExportEntry,
    Jsonifiable,
    JSONSerializeOptions,
    JSONStringOf,
    MergeArrayModes,
    PlainObject,
} from '@snailicid3/node-utils'
