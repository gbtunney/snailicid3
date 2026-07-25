import { defineNxConfig } from '../api-functions.js'

export default defineNxConfig({
    targetDefaults: {
        'clean': {
            cache: false,
            dependsOn: ['clean:ts', 'clean:build'],
        },
        'clean:build': {
            cache: false,
            command: 'rm -rf ./dist ./types ./temp ./tmp',
            options: { cwd: '{projectRoot}' },
        },
        'clean:ts': {
            cache: false,
            /**
             * (fix) also clean `tsconfig.build.json` and drop `node_modules/.tmp`. `tsBuildInfoFile` points at
             * `${configDir}/node_modules/.tmp/*.tsbuildinfo`, so the previous `rm -f src/tsconfig.tsbuildinfo
             * tsconfig.tsbuildinfo` never removed the real file — tsc then reported "up to date" after a clean and
             * emitted nothing, leaving `dist` empty on the next build.
             */
            command:
                'pnpm exec tsc --build --clean && if [ -f tsconfig.build.json ]; then pnpm exec tsc --build --clean tsconfig.build.json; fi && if [ -f tsconfig.docs.json ]; then pnpm exec tsc --build --clean tsconfig.docs.json; fi && rm -rf node_modules/.tmp && rm -f src/tsconfig.tsbuildinfo tsconfig.tsbuildinfo',
            options: { cwd: '{projectRoot}' },
        },
    },
})
