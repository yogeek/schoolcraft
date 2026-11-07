import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, type Plugin } from 'vite';

/** Emit sw.js with the build version and the list of build files to cache (offline from the first visit). */
function serviceWorker(): Plugin {
  return {
    name: 'schoolcraft-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((f) => f.startsWith('assets/') && !f.endsWith('.map'))
        .sort();
      const version = createHash('sha1').update(assets.join('\n')).digest('hex').slice(0, 10);
      const source = readFileSync(new URL('./src/sw.js', import.meta.url), 'utf8')
        .replaceAll('__VERSION__', version)
        .replaceAll('__ASSETS__', JSON.stringify(assets));
      if (source.includes('__VERSION__') || source.includes('__ASSETS__')) this.error('sw.js: placeholder not replaced');
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

// base relative: works on GitHub Pages (/schoolcraft/) as well as at a domain root
export default defineConfig({
  base: './',
  plugins: [serviceWorker()],
});
