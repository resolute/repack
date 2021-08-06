import { minify } from 'terser';
import esbuild from 'esbuild';
import type { Handler } from './types.js';

const js: Handler = (/* repack */) => async ({ source: input }) => {
  const result = await esbuild.build({
    entryPoints: [input],
    bundle: true,
    write: false,
    target: ['chrome72', 'safari13'],
    format: 'esm',
  });
  const bundle = result.outputFiles[0].text;
  const prefix = 'const window = self; const document = window.document;\n';
  const { code: minified } = await minify(`${prefix}${bundle}`, {
    toplevel: true,
    compress: { toplevel: true, hoist_props: true, passes: 4 },
    mangle: { toplevel: true },
  });

  if (typeof minified === 'undefined') {
    throw new Error(`JS optimization/minification failed for “${input}”`);
  }
  return Buffer.from(minified);
};

export default js;
