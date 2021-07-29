import { minify } from 'terser';
import esbuild = require('esbuild');
// eslint-disable-next-line import/first
import { Handler } from './types.js';

const js: Handler = (/* repack */) => async ({ source: input }) => {
  const result = await esbuild.build({
    entryPoints: [input],
    bundle: true,
    write: false,
  });
  const bundle = result.outputFiles[0].text;
  const { code: minified } = await minify(bundle, {
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
