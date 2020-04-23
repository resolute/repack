import path from 'path';
import util from 'util';
import autoprefixer from 'autoprefixer';
import postcss from 'postcss';
import postcssSorting from 'postcss-sorting';
import cssMqpacker from 'css-mqpacker';
import sass from 'sass';
import { Handler } from '.';

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

const sassRender = util.promisify(sass.render);

const css: Handler = (repack) => async ({ source: file }) => sassRender({
  file,
  includePaths: [path.dirname(file)],
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
  // .catch(sass.logError)
  .then(({ css }) =>
    postcss([
      autoprefixer(),
      cssMqpacker(),
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
