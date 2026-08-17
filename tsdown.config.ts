/**
 * Self-contained tsdown build for dsh-chat-image.
 *
 * - The node half (src/index.ts) bundles to lib/index.js (ESM): the dsh Loader
 *   imports the package main to mount the chat-image route row. It has no
 *   runtime imports, so nothing is externalized.
 * - The browser half (src/client/index.ts) bundles to lib/client.js (CJS,
 *   loader-wrapped): the dsh client-modules service serves it at
 *   /plugins/dsh-chat-image/client.js and the browser evaluates it through
 *   window.__ModuleLoader__.load. Only the frozen platform-module table may
 *   stay external — anything else would inline a duplicate runtime instance
 *   or require a specifier the table cannot answer.
 */
import { defineConfig } from 'tsdown'

/** The module specifiers the dsh shell shares into the frozen module table. */
const PLATFORM_MODULES = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
]

export default defineConfig([
  {
    name: 'dsh-chat-image',
    entry: { index: 'src/index.ts' },
    outDir: 'lib',
    format: ['esm'],
    platform: 'node',
    target: 'es2022',
    // Types ship from lib/types (tsc); the package main is lib/index.js.
    dts: false,
    fixedExtension: false,
    clean: false,
  },
  {
    name: 'dsh-chat-image/client',
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2022',
    sourcemap: true,
    // Types ship from lib/types (tsc); dts here would add a second declaration set.
    dts: false,
    external: PLATFORM_MODULES,
    noExternal: (id: string) => (PLATFORM_MODULES.includes(id) ? undefined : true),
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: \'dsh-chat-image\', factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])
