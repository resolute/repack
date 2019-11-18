/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import fs = require('fs');
import path = require('path');
import markoHotReload = require('marko/hot-reload');
import markoNodeRequire = require('marko/node-require');

// Node.js can require() `.marko` files
markoNodeRequire.install();
markoHotReload.enable({ silent: true });

const { mkdir, writeFile } = fs.promises;

// const html = (assets) => ([config, tpl, assets]) => Promise.all(tpl)
//   .then((tpl) => Promise.all(tpl
//     // @ts-ignore
//     .filter(({ file }) => !/components/.test(file) && config.build.html.test(file))
//     .map(({ file, template }) => {
//       const outputFilename = `${config.build.htmlDir}/${
//         file
//           .replace(new RegExp(`^${config.build.tplDir}`), '')
//           .replace(/\.marko$/, '.html')}`;
//       const deepdirs = outputFilename.match(/^(.+)\/.+?$/);
//       return (deepdirs ?
//         mkdir(deepdirs[1], { recursive: true }) :
//         Promise.resolve()
//       )
//         .then(async () =>
//           writeFile(outputFilename,
//             await template.render({ ...config, asset: assets.get })));
//     })));

const defaultRewrite = (path: string) => path.replace(/^.*?tpl\//, 'web/html/').replace(/\.marko$/, '.html');

// const html = (asset) => ({ rewrite = defaultRewrite } = {}) => async (filename, config) => {
//   const outFile = rewrite(filename);
//   console.debug(`${filename} → ${outFile}`);
//   const template = require(path.join(process.cwd(), filename));
//   const dirname = path.dirname(outFile);
//   await mkdir(dirname, { recursive: true });
//   writeFile(outFile, await template.render({ ...(await config), asset }));
// };

// export = html;
const marko = (asset) => ({ rewrite = defaultRewrite } = {}) => async (filename, config) => {
  const outFile = rewrite(filename);
  console.debug(`${filename} → ${outFile}`);
  const template = require(path.join(process.cwd(), filename));
  const dirname = path.dirname(outFile);
  await mkdir(dirname, { recursive: true });
  writeFile(outFile, await template.render({ ...(await config), asset }));
};

marko.delete = (filename) => {
  markoHotReload.handleFileModified(filename, { silent: true });
};

export = marko;
