import { dirname } from 'path';
// import { promisify } from 'util';

import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import postcssSorting from 'postcss-sorting';
import postcssCombineMediaQuery from 'postcss-combine-media-query';
import sass from 'sass';
import type { Handler } from './types.js';

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
}[i])!);

// const sassRender = promisify(sass.render);

const css: Handler = (repack) => async ({ source: file }) => sass.compileAsync(
  file,
  {
    loadPaths: [dirname(file)],
    style: 'compressed',
    functions: {
      // TODO 'asset' helper function for SASS
      'asset($file, $inline: "")': async (args: sass.Value[]) => {
        const file = args[0].assertString('arg1').text;
        const inline = args[1].assertString('arg2').text;
        if (inline !== '') {
          // TODO handle base64 encoding, etc…
        }
        return repack(file).then((version) => new sass.SassString(`url("${version.uri}")`, { quotes: false }));
      },
      'inline-svg($file, $fill:"")': async (args: sass.Value[]) => {
        const file = args[0].assertString('arg1').text;
        const fill = args[1].assertString('arg2').text;
        if (!file) {
          throw new Error('No SVG file specified');
        }
        return repack(file).then((version) => version.data).then((svg) => {
          if (!svg /* || !(svg instanceof Version) */) {
            throw new Error(`${file} not found in svg object.`);
          }
          let data = svg.toString();
          if (fill !== '') {
            data = data.replace(
              /(['"])#[0-9A-Fa-f]{3,6}/g,
              `$1#${fill.replace(/^#/, '')}`,
            );
          }
          return new sass.SassString(`url("data:image/svg+xml,${escape(data)}")`, { quotes: false });
        }).catch((error) => {
          console.error(error);
          throw error;
        });
      },
    },
  },
)
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

export default css;
