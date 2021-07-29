/* eslint-disable no-sequences */
/* eslint-disable consistent-return */
/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import * as compiler from '@marko/compiler';
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
      const templatePath = path.join(process.cwd(), filename);
      // const template = Marko
      //   .load(
      //     templatePath,
      //     // await fs.readFile(templatePath, 'utf-8'),
      //     // { buffer: true, writeToDisk: false },
      //     // { modules: 'esm', writeToDisk: true },
      //   );
      // const template = await import(path.join(process.cwd(), `${filename}.js`));
      console.log(1);
      const template = await compiler.compile(
        await fs.readFile(filename, 'utf-8'),
        templatePath,
        {
          modules: 'cjs',
          // cache: markoCache,
        },
      );
      console.log(2);
      // console.log(template);
      // await fs.writeFile(`${templatePath}.js`,
      //   template.code.replace(/\.marko";/g, '.marko.js";'));
      await fs.writeFile(`${templatePath}.js`, template.code);
      // process.exit();
      const data = { ...(await config), $global: { repack } };
      // console.log(template, data, dirname);

      // const templateModule = new Module(templatePath);
      // templateModule.paths = [path.dirname(templatePath)];
      // templateModule.filename = templatePath;

      // // Module._cache[templatePath] = templateModule;

      // // @ts-ignore
      // // eslint-disable-next-line no-underscore-dangle
      // templateModule._compile(template.code, templatePath);
      // const require = createRequire(import.meta.url);
      // eslint-disable-next-line import/no-dynamic-require
      // const templateModule = require(`${templatePath}.js`);
      console.log(3);
      // const compiledTemplate = templateModule.exports;
      const compiledTemplate = Marko.load(templatePath);
      // console.log(`${templatePath}.js`);
      // const compiledTemplate = await import(`${templatePath}.js`);
      await fs.mkdir(dirname, { recursive: true });
      await fs.writeFile(outFile, (await compiledTemplate.render(data)).getOutput());
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
