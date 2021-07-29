/* eslint-disable no-sequences */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from 'fs';
import path from 'path';
// import { compile } from '@marko/compiler';
import Marko from 'marko';
import { Repack } from './types.js';
// import markoHotReload = require('marko/hot-reload.js');

// markoHotReload.enable({ silent: true });

// const markoCache = new Map();

const defaultRewrite = (path: string) => path.replace(/^.*?tpl\//, 'web/html/').replace(/\.marko$/, '.html');

const trimDirectoryPrefix = (str: string) =>
  str.replace(/^.*?tpl\//, '').replace(/^.*?web\/html\//, '');

const marko = (repack: Repack) => {
  const marko = ({ rewrite = defaultRewrite } = {}) =>
    async (filename: string, config: any) => {
      // eslint-disable-next-line no-unused-expressions
      repack; config;
      const outFile = rewrite(filename);
      const dirname = path.dirname(outFile);
      console.debug(`… ${trimDirectoryPrefix(filename)} → ${trimDirectoryPrefix(outFile)}`);
      const template = Marko
        .load(
          `${process.cwd()}/${filename}`,
          // { buffer: true, writeToDisk: false },
        );
      // const template = await import(path.join(process.cwd(), `${filename}.js`));
      // const template = await compile(
      //   await fs.promises.readFile(filename, 'utf-8'),
      //   path.join(process.cwd(), filename),
      //   {
      //     modules: 'esm',
      //     cache: markoCache,
      //   },
      // );
      // console.log(template.code);
      // fs.promises.writeFile(`${filename}.js`, template.code);
      // process.exit();
      const data = { ...(await config), $global: { repack } };
      await fs.promises.mkdir(dirname, { recursive: true });
      await fs.promises.writeFile(outFile, (await template.render(data)).getOutput());
      console.debug(`✓ ${trimDirectoryPrefix(filename)} → ${trimDirectoryPrefix(outFile)}`);
    };
  // @ts-ignore
  marko.render = (markup: string, data: any) => {
    if (!markup) {
      return undefined;
    }
    // return Marko
    //   .load(
    //     `${process.cwd()}/tpl/${data.uri || Math.random()}.marko`,
    //     markup,
    //     { buffer: true, writeToDisk: false },
    //   )
    //   .render({ ...data, $global: { repack, ...data.$global } })
    //   .then((result) => result.getOutput());
  };
  return marko;
};

marko.delete = (filename) => {
  console.log(filename);
  // markoHotReload.handleFileModified(filename, { silent: true });
};

export default marko;
