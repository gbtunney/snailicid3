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
            command:
                'pnpm exec tsc --build --clean && if [ -f tsconfig.docs.json ]; then pnpm exec tsc --build --clean tsconfig.docs.json; fi && rm -f src/tsconfig.tsbuildinfo tsconfig.tsbuildinfo',
            options: { cwd: '{projectRoot}' },
        },
    },
})
