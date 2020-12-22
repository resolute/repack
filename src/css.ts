// eslint-disable-next-line import/order
import { Handler } from './types';
import { dirname } from 'path';
import { promisify } from 'util';

import autoprefixer = require('autoprefixer');
import postcss = require('postcss');
import postcssSorting = require('postcss-sorting');
import postcssCombineMediaQuery = require('postcss-combine-media-query');
import sass = require('sass');

const escape = (str: string) => str.replace(/["%&#{}<>|]/g, (i) => ({
  '"': '\'',
  '%': '%25',
  '&': '%26',
  '#': '%23',
  '{': '%7B',
  '}': '%7D',
  '<': '%3C',
  '>': '%3E',
  '|': '%7C',
}[i]));

const sassRender = promisify(sass.render);

const css: Handler = (repack) => async ({ source: file }) => sassRender({
  file,
  includePaths: [dirname(file)],
  outputStyle: 'compressed',
  functions: {
    // TODO 'asset' helper function for SASS
    'asset($file, $inline: "")': (rawFile: any, rawInline: any, done: any) => {
      const file = rawFile.getValue();
      const inline = rawInline.getValue();
      if (inline !== '') {
        // TODO handle base64 encoding, etc…
      }
      repack(file).then((version) => {
        done(new sass.types.String(`url("${version.uri}")`));
      });
    },
    'inline-svg($file, $fill:"")': (rawFile: any, rawFill: any, done: any) => {
      const file = rawFile.getValue();
      const fill = rawFill.getValue();
      if (!file) {
        throw new Error('No SVG file specified');
      }
      repack(file).then((version) => version.data).then((svg) => {
        if (!svg /* || !(svg instanceof Version) */) {
          throw new Error(`${file} not found in svg object.`);
        }
        let data = svg.toString();
        if (fill !== '') {
          data = data.replace(/(['"])#[0-9A-Fa-f]{3,6}/g,
            `$1#${fill.replace(/^#/, '')}`);
        }
        done(new sass.types.String(`url("data:image/svg+xml,${escape(data)}")`));
      }).catch((error) => {
        console.error(error);
      });
    },
  },
})
  // .catch(logError)
  .then(({ css }) =>
    // @ts-ignore
    postcss([
      autoprefixer(),
      postcssCombineMediaQuery(),
      postcssSorting({
        order: ['custom-properties', 'dollar-variables', 'declarations', 'rules', 'at-rules'],
        'properties-order': 'alphabetical',
        'unspecified-properties-position': 'bottomAlphabetical',
      }),
    ])
      .process(css, { from: undefined }))
  // remove any left over newlines
  .then(({ css }) => Buffer.from(css.toString().replace(/\n/g, '')));

export = css;
