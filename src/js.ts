import Rollup = require('rollup');
import resolve = require('rollup-plugin-node-resolve');
import commonjs = require('rollup-plugin-commonjs');
import babel = require('rollup-plugin-babel');
import json = require('rollup-plugin-json');
import typescript = require('rollup-plugin-typescript');
import terser = require('terser');

const { rollup } = Rollup;

const js = (asset) => async (input, variant) => { // => async (legacy = false) => {
  const { filename } = input;
  // TODO figure out how to do variants
  const legacy = variant === 'legacy';
  console.log(`legacy ${legacy}`);
  const { generate } = await rollup({
    input: filename,
    plugins: [
      json(),
      typescript({
        paths: { '*': ['types/*'] },
        baseUrl: '.',
        resolveJsonModule: true,
        moduleResolution: 'node',
        downlevelIteration: true,
        target: legacy ? 'es5' : 'esnext',
        module: 'esnext',
        lib: ['esnext', 'dom', 'DOM.Iterable', 'ScriptHost'],
        strict: false,
        sourceMap: true,
        declaration: true,
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        typeRoots: ['node_modules/@types'],
      }),
      (resolve.default || resolve)({
        mainFields: ['module', 'main', 'main:jsnext'],
        browser: true,
        preferBuiltins: false,
      }),
      // @ts-ignore not sure why this is acting up
      commonjs(),
      ...(legacy ? [
        babel({
          presets: [
            ['@babel/preset-env', {
              modules: false,
              targets: { browsers: ['IE 11'] },
              useBuiltIns: 'usage',
              corejs: 3,
              // useBuiltIns: 'usage', // 7beta not working properly
              // debug: true
            }],
          ],
        }),
      ] : []),
    ],
  });
  const bundle = (await generate({
    format: 'es',
    preferConst: true,
    intro: (
      legacy ?
        '(function (window, document) {\n"use strict";' :
        'const window = self; const document = window.document;\n'
    ),
    outro: (
      legacy ?
        '})(window, document)' :
        ''
    ),
  })).output[0].code;

  const { code: minified } = terser.minify(bundle, {
    toplevel: true,
    warnings: true,
    compress: { toplevel: true, hoist_props: true, passes: 4 },
    mangle: { toplevel: true },
  });

  return { ...input, data: minified };
};

export = js;
