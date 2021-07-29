// eslint-disable-next-line import/order
import { Repack } from './types.js';

import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import Marko from 'marko';
import markoHotReload from 'marko/hot-reload.js';

markoHotReload.enable({ silent: true });

const require = createRequire(import.meta.url);

const defaultRewrite = (path: string) => path.replace(/^.*?tpl\//, 'web/html/').replace(/\.marko$/, '.html');

const trimDirectoryPrefix = (str: string) =>
  str.replace(/^.*?tpl\//, '').replace(/^.*?web\/html\//, '');

const marko = (repack: Repack) => {
  const marko = ({ rewrite = defaultRewrite } = {}) =>
    async (filename: string, config: any) => {
      const outFile = rewrite(filename);
      console.debug(`… ${trimDirectoryPrefix(filename)} → ${trimDirectoryPrefix(outFile)}`);
      // const template = await import(path.join(process.cwd(), filename));
      // eslint-disable-next-line import/no-dynamic-require
      const template = require(path.join(process.cwd(), filename));
      const dirname = path.dirname(outFile);
      await fs.mkdir(dirname, { recursive: true });
      const data = { ...(await config), $global: { repack } };
      await fs.writeFile(outFile, (await template.render(data)).getOutput());
      console.debug(`✓ ${trimDirectoryPrefix(filename)} → ${trimDirectoryPrefix(outFile)}`);
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
      .render({ ...data, $global: { repack, ...data.$global } })
      .then((result) => result.getOutput());
  };
  return marko;
};

marko.delete = (filename) => {
  markoHotReload.handleFileModified(filename, { silent: true });
};

export default marko;
