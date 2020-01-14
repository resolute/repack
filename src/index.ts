import { register } from 'ts-node';
import { Watcher } from 'sane';

import fs = require('fs');

import svg = require('./svg');
import js = require('./js');
import css = require('./css');
import img = require('./img');
import marko = require('./marko');
import watch = require('./watch');
import assets = require('./assets');
import glob = require('fast-glob');

if (Object.keys(require.extensions).indexOf('.ts') === -1) {
  // Node.js can require() `.ts` files
  register({
    project: `${process.cwd()}/tsconfig.json`,
  });
}

const doNothing = (repack) => async (input) => (input.data ? input :
  { ...input, data: await fs.promises.readFile(input.filename) });

const defaultHandlers = [
  [['.jpg', '.png', '.webp', '.gif'], img],
  [['.svg'], svg],
  [['.css'], css],
  [['.js'], js],
  [['.woff2', '.woff'], doNothing],
];
const defaultSrc = ['**/*', '!**/node_modules'];

const buildConfig = import(`${process.cwd()}/etc/build`).catch((error) => {
  process.emitWarning('No etc/build.ts found, using defaults.', 'BuildWarning');
  return {
    run: async ({ glob, marko }: any) => {
      const config = await import(`${process.cwd()}/etc/config`).catch(() => ({}));
      const templates = await glob(['tpl/**/*.marko', '!tpl/components/**/*']);
      Promise.all(templates
        .map((template: any) => marko()(template, config)));
    },
  };
});

type repack = ReturnType<typeof assets> & { run: () => Promise<any>; watch: () => Watcher; };

export = async (commandOptions?) => {
  const options = {
    handlers: defaultHandlers,
    src: defaultSrc,
    ...(await buildConfig),
    ...commandOptions,
  };
  // console.debug('build invoked');
  const repack = assets(options) as repack;
  repack.run = () => options.run({
    svg: svg(repack),
    js: js(repack),
    css: css(repack),
    img: img(repack),
    marko: marko(repack),
    glob,
    repack,
  });
  repack.watch = () => watch(repack);
  return repack;
};
