import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import webExtension from 'vite-plugin-web-extension';

// Manifest V3 build — Firefox (default) and Chrome.
// - `svelte` compiles src/ui/App.svelte (mounted by the content script into a Shadow DOM root).
// - `webExtension` reads src/manifest.json (with {{firefox}}/{{chrome}} vendor keys), bundles the
//   background + content scripts for the target, and integrates `web-ext` for `npm run dev`.
// Pick the target with Vite's mode: `--mode chrome` builds Chrome; the default is Firefox.
export default defineConfig(({ mode }) => {
  const browser = mode === 'chrome' ? 'chrome' : 'firefox';
  return {
    plugins: [
      // App.svelte has no scoped <style>; overlay.css is imported `?inline` and injected
      // into the shadow root by the content script (head-injected styles can't reach it).
      svelte(),
      webExtension({
        manifest: 'src/manifest.json',
        browser,
        webExtConfig: {
          target: 'firefox-desktop',
          startUrl: ['https://www.skool.com/'],
        },
      }),
    ],
    build: {
      // web-ext loads from dist/; keep readable output for debugging.
      minify: false,
      emptyOutDir: true,
    },
  };
});
