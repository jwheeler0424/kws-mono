import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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
      ignored: ['**/public/media/**'],
    },
  },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});

export default config;
