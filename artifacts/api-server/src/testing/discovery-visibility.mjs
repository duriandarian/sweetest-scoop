/** Bundle real UI components for server-rendered disclosure regressions; no browser or API calls. */
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const app = fileURLToPath(new URL('../../../sweetest-scoop/', import.meta.url));
const outdir = join(app, 'node_modules/.cache');
const names = ['discovery-visibility.test', 'question-preview-state.test'];
await build({
  entryPoints: names.map(name => join(app, `src/game/${name}.ts`)),
  outdir, outExtension: { '.js': '.mjs' }, bundle: true, platform: 'node', packages: 'external', format: 'esm',
  jsx: 'automatic', loader: { '.css': 'empty' },
  define: { 'import.meta.env': JSON.stringify({ BASE_URL: '/', DEV: false }) },
  plugins: [{
    name: 'exact-wardrobe-paths',
    setup(builder) {
      // Bundle workspace packages that export TypeScript with extensionless imports.
      builder.onResolve({ filter: /^@workspace\/(?:api-client-react|scoop-rules)$/ }, args => ({
        path: join(app, '../../lib', args.path.split('/')[1], 'src/index.ts'),
      }));
      // esbuild's extension fallback conflates Wardrobe.tsx and wardrobe.ts
      // when both extensionless imports occur in a single standalone bundle.
      builder.onResolve({ filter: /^\.\/(?:Wardrobe|wardrobe)$/ }, args => ({
        path: join(args.resolveDir, args.path === './Wardrobe' ? 'Wardrobe.tsx' : 'wardrobe.ts'),
      }));
    },
  }],
});
const result = spawnSync(process.execPath, ['--test', ...names.map(name => join(outdir, `${name}.mjs`))], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
