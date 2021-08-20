import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import Marko from 'marko';
import FastGlob from 'fast-glob';
import type { Repack } from './types';

const require = createRequire(import.meta.url);

const defaultRewrite = (path: string) => path.replace(/^.*?tpl\//, 'web/html/').replace(/\.marko$/, '.html');

const trimDirectoryPrefix = (str: string) =>
  str.replace(/^.*?tpl\//, '').replace(/^.*?web\/html\//, '');

const markoComponentFiles = FastGlob('tpl/**/components/*.marko');
const preloadComponentsWorkaround = async () => {
  let iterations = 0;
  const LIMIT = 10;
  const load = (file: string) => {
    try {
      Marko.load(file);
    } catch (error) {
      return false;
    }
    return true;
  };
  const files = await markoComponentFiles;
  const set = new Set([...files]);
  while (set.size > 0) {
    if (++iterations > LIMIT) {
      throw new Error(`Marko component preloading workaround failed after trying to load ${[...set]} after ${iterations} times.`);
    }
    for (const file of set) {
      const result = load(file);
      if (result === false) {
        // console.debug(`${file} failed`);
        // eslint-disable-next-line no-use-before-define
        marko.delete(file);
      } else {
        set.delete(file);
      }
    }
  }
};

const marko = (repack: Repack) => {
  const marko = ({ rewrite = defaultRewrite } = {}) =>
    async (filename: string, config: any) => {
      await preloadComponentsWorkaround();
      const outFile = rewrite(filename);
      console.debug(`… ${trimDirectoryPrefix(filename)} → ${trimDirectoryPrefix(outFile)}`);
      const template = Marko.load(filename);
      const dirname = path.dirname(outFile);
      await fs.promises.mkdir(dirname, { recursive: true });
      const data = { ...(await config), $global: { repack } };
      await fs.promises.writeFile(outFile, (await template.render(data)).getOutput());
      console.debug(`✓ ${trimDirectoryPrefix(filename)} → ${trimDirectoryPrefix(outFile)}`);
    };
  marko.render = async (markup: string, data: any) => {
    if (!markup) {
      return undefined;
    }
    await preloadComponentsWorkaround();
    const fauxTemplate = Marko
      .load(
        `${process.cwd()}/tpl/${data.uri || Math.random()}.marko`,
        markup,
        { buffer: true, writeToDisk: false },
      );
    const payload = { ...data, $global: { repack, ...data.$global } };
    const renderedTemplate = await fauxTemplate.render(payload);
    return renderedTemplate.getOutput();
  };
  return marko;
};

marko.delete = (filename?: string) => {
  for (const file of Object.keys(require.cache)) {
    if (filename) {
      if (file.includes(filename)) {
        delete require.cache[file];
        // console.debug(`purge ${file}`);
      }
    } else {
      delete require.cache[file];
    }
  }
};

export default marko;
