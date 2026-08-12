/**
 * Compatibility barrel. The shared formatting policy is now organized under `./shared/`: file-extension constants in
 * `shared/extensions.ts` and width/formatting rules in `shared/formatting.ts`. Existing `./shared.js` imports keep
 * resolving through this re-export.
 */
export * from './shared/index.js'
