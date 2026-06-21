/**
 * Vite Configuration ( only docserver for now )
 *
 * @module vite
 * @see [Vite - Next Generation Frontend Tooling](https://vitejs.dev/)
 */

import { defineConfig, type UserConfig as ViteDocConfig } from 'vite'

/** Vite configuration for documentation server */
export const docServer = (port = 5555): ViteDocConfig => {
    return defineConfig({
        base: './',
        publicDir: './docs',
        root: './docs',
        server: {
            port: port,
            strictPort: true,
        },
    })
}

export default docServer
