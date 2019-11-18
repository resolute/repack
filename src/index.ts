import { register } from 'ts-node';
import { Watcher } from 'sane';

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

const defaultHandlers = [
  [['.jpg', '.png', '.webp', '.gif'], img],
  [['.svg'], svg],
  [['.css'], css],
  [['.js'], js],
];
const defaultSrc = ['**/*', '!**/node_modules'];

const buildConfig = import(`${process.cwd()}/etc/build`).catch((error) => {
  process.emitWarning('No etc/build.ts found, using defaults.', 'BuildWarning');
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
  const asset = assets(options) as repack;
  asset.run = () => options.run({
    svg: svg(asset),
    js: js(asset),
    css: css(asset),
    img: img(asset),
    marko: marko(asset),
    glob,
    asset,
  });
  asset.watch = () => watch(asset);
  return asset;
};
