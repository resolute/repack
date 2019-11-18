import path = require('path');

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

const util = require('util');
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const postcssSorting = require('postcss-sorting');
const cssMqpacker = require('css-mqpacker');
const sass = require('node-sass');

const sassRender = util.promisify(sass.render);

const css = (asset) => async (input) => {
  const { filename } = input;
  return sassRender({
    file: filename,
    includePaths: [path.dirname(filename)],
    outputStyle: 'compressed',
    functions: {
      // TODO 'asset' helper function for SASS
      'asset($file, $inline: "")': (rawFile, rawInline, done) => {
        const file = rawFile.getValue();
        const inline = rawInline.getValue();
        if (inline !== '') {
          // TODO handle base64 encoding, etc…
        }
        asset(file).then((version) => {
          done(new sass.types.String(`url("${version.uri}")`));
        });
      },
      'inline-svg($file, $fill:"")': (rawFile, rawFill, done) => {
        const file = rawFile.getValue();
        const fill = rawFill.getValue();
        if (!file) {
          throw new Error('No SVG file specified');
        }
        asset(file).then((version) => {
          const svg = version.data;
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
    .catch(sass.logError)
    .then(({ css }) => postcss([
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
    .then(({ css }) => css.replace(/\n/g, ''))
    .then((data) => ({ ...input, data }));
};
export = css;
