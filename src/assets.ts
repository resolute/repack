/* eslint-disable no-restricted-syntax */
import fs = require('fs');
import path = require('path');

import got = require('got');
import glob = require('fast-glob');
import Version = require('./version');

const { readFile, writeFile } = fs.promises;

const database: { [filename: string]: { [variant: string]: Promise<Version> } } = {};
const destDir = 'web/s';
const destUri = '/s';

const mimeToExt = (mime) => {
  switch (mime) {
    case 'application/font-woff2': return '.woff2';
    case 'application/font-woff': return '.woff';
    case 'image/jpeg': return '.jpg';
    case 'image/png': return '.png';
    case 'image/svg+xml': return '.svg';
    default: return '';
  }
};

const extMap = (str: string) => str.replace(/\.ts$/, '.js').replace(/\.s[ca]ss$/, '.css');

// const readJson = async (file = 'etc/assets.json') => {
//   try {
//     const raw = await readFile(file);
//     return JSON.parse(raw.toString());
//   } catch {
//     return [];
//   }
// };

// const read = async (file = 'etc/assets.json') => {
//   const json = await readJson(file);
//   // @ts-ignore
//   return Object.entries(json).map((asset) => version({ ...asset, destDir, destUri }));
// };

const save = async (file = 'etc/assets.json') => {
  // TODO sort
  await writeFile(file, JSON.stringify(
    await (async () => {
      const result = {};
      for (const [filename, value] of Object.entries(database)) {
        result[filename] = {};
        for (const [variant, payload] of Object.entries(value)) {
          // eslint-disable-next-line no-await-in-loop
          result[filename][variant] = await payload;
        }
      }
      return result;
    })(),
    null,
    4,
  ));
};
process.on('beforeExit', async () => {
  await save();
  process.exit();
});

const match = (needle: string) => (haystack) => {
  // const matcher = new RegExp(`${filename}`);
  if (haystack.indexOf(needle) !== -1) {
    return true;
  }
  if (extMap(haystack).indexOf(needle) !== -1) {
    return true;
  }
  return false;
};

const assets = ({ handlers, src }) => {
  // console.debug('NEW asset database instance!!!');
  const sourceGlob = glob(src);
  const repack = async (filename: string, variant = 'generic') => {
    // console.debug(`repack: ${filename}`);
    const srcSettled = await sourceGlob;
    const localFile = srcSettled.find(match(filename));
    const normalizedFilename = localFile || filename;
    const variantSlug = typeof variant === 'string' ? variant : JSON.stringify(variant);
    // const found = variantLookup(normalizedFilename);
    // if (found) {
    //   // console.debug(`FOUND ${filename} normalized: ${normalizedFilename}`);
    //   return found;
    // }
    if (database[normalizedFilename] && database[normalizedFilename][variantSlug]) {
      // console.debug(`repack: HIT: ${filename}`);
      return database[normalizedFilename][variantSlug];
    }
    if (!database[normalizedFilename]) {
      database[normalizedFilename] = {};
    }
    // console.debug(`repack: MISS: ${filename}`);
    database[normalizedFilename][variantSlug] = (async () => {
      let data: Buffer | string | undefined;
      let ext: string = extMap(path.parse(filename).ext);
      if (/https?:/.test(filename)) {
        const { headers, body } = await got(filename, { encoding: null });
        ext = mimeToExt(headers['content-type']);
        data = body;
      }
      const [handler] = handlers
        .filter(([extensions]) => extensions.indexOf(ext) !== -1)
        .map(([, handler]) => handler);
      if (handler) {
        // console.debug(`repack: ${filename} handler: ${handler.name}`);
        return new Version(await handler(repack)({
          filename: normalizedFilename,
          ext,
          data,
          destUri,
          destDir,
        }, variant));
      }
      process.emitWarning(`No handler for “${filename}”...treating as-is.`);
      return new Version({
        filename,
        ext,
        data: localFile ? await readFile(localFile) : data!,
        destUri,
        destDir,
      });
    })();
    return database[normalizedFilename][variantSlug];
  };
  repack.delete = async (filename: string) => {
    // console.debug(`del requested: ${filename}`);
    const srcSettled = await sourceGlob;
    const localFile = srcSettled.find(match(filename));
    const normalizedFilename = localFile || filename;
    if (database[normalizedFilename]) {
      console.debug(`DELETE ${normalizedFilename}`);
      delete database[normalizedFilename];
    }
  };
  repack.all = () => database;
  return repack;
};

export = assets;
