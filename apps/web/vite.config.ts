import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

const copyPublicWithoutMedia = (): Plugin => {
  let rootDir = process.cwd();
  let outDir = path.resolve(rootDir, 'dist');

  return {
    name: 'copy-public-without-media',
    apply: 'build',
    config() {
      // Avoid Vite's default behavior of copying all of public/ into dist/.
      return { publicDir: false };
    },
    configResolved(config) {
      rootDir = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const publicDir = path.resolve(rootDir, 'public');

      await mkdir(outDir, { recursive: true });

      await cp(publicDir, outDir, {
        recursive: true,
        dereference: true,
        filter(src) {
          const rel = path.relative(publicDir, src);
          if (!rel) return true;

          const normalized = rel.split(path.sep).join('/');
          return normalized !== 'media' && !normalized.startsWith('media/');
        },
      });
    },
  };
};

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    // Linked workspace packages (for example @kws/design) can otherwise resolve
    // their own React instance, which breaks hooks at runtime.
    dedupe: ['react', 'react-dom'],
  },
  server: {
    watch: {
      // Avoid crawling large generated media trees during dev server startup.
      ignored: ['**/public/media/mls/**'],
    },
  },
  plugins: [
    copyPublicWithoutMedia(),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

export default config;
