/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
import fs from 'fs';
import path from 'path';
import Marko from 'marko';

import markoHotReload from 'marko/hot-reload';
import markoNodeRequire from 'marko/node-require';
import { Repack } from '.';

// Node.js can require() `.marko` files
markoNodeRequire.install();
markoHotReload.enable({ silent: true });

const { mkdir, writeFile } = fs.promises;

const defaultRewrite = (path: string) => path.replace(/^.*?tpl\//, 'web/html/').replace(/\.marko$/, '.html');

const marko = (repack: Repack) => {
  const marko = ({ rewrite = defaultRewrite } = {}) =>
    async (filename: string, config: any) => {
      const outFile = rewrite(filename);
      console.debug(`… ${filename} → ${outFile}`);
      const template = require(path.join(process.cwd(), filename));
      const dirname = path.dirname(outFile);
      await mkdir(dirname, { recursive: true });
      const data = { ...(await config), $global: { repack } };
      await writeFile(outFile, await template.render(data));
      console.debug(`✓ ${filename} → ${outFile}`);
    };
  marko.render = (markup: string, data: any) => {
    if (!markup) {
      return undefined;
    }
    return Marko
      .load(
        `${process.cwd()}/tpl/${data.uri || Math.random()}.marko`,
        markup,
        { buffer: true, writeToDisk: false },
      )
      .render({ ...data, $global: { repack, ...data.$global } });
  };
  return marko;
};

marko.delete = (filename) => {
  markoHotReload.handleFileModified(filename, { silent: true });
};


export default marko;
