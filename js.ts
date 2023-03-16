import { minify, MinifyOptions } from 'terser';
import * as esbuild from 'esbuild';
import type { BuildOptions } from 'esbuild';
import type { Handler } from './types.js';

// export type EsbuildOptions = Omit<BuildOptions, 'write' | 'entryPoints'> & { prefix: string };
// export type TerserOptions = MinifyOptions;
export interface JsOptions {
  prefix?: string | ((input: string, sourceUri: string) => string);
  esbuild?: Partial<Omit<BuildOptions, 'write' | 'entryPoints'>>;
  terser?: Partial<MinifyOptions>;
}

const js = (options?: JsOptions): Handler =>
  (/* repack */) => async ({ source: input }) => {
    const { prefix: bundlePrefix, esbuild: esbuildOptions, terser: terserOptions } = options ?? {};
    const result = await esbuild.build({
      entryPoints: [input],
      bundle: true,
      write: false,
      target: ['chrome80', 'safari15'],
      format: 'esm',
      ...esbuildOptions,
    });
    const bundle = result.outputFiles[0].text;
    const prefix = typeof bundlePrefix === 'string' ? bundlePrefix : 'const window = self; const document = window.document;';
    const prefixer = typeof bundlePrefix === 'function' ? bundlePrefix : (code: string) => `${prefix}\n${code}`;
    const { code: minified } = await minify(prefixer(bundle, input), {
      toplevel: true,
      compress: { toplevel: true, hoist_props: true, passes: 4 },
      mangle: { toplevel: true },
      ...terserOptions,
    });

    if (typeof minified === 'undefined') {
      throw new Error(`JS optimization/minification failed for “${input}”`);
    }
    return Buffer.from(minified);
  };

export default js;
