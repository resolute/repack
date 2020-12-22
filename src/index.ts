/* eslint-disable import/order */
/* eslint-disable no-restricted-syntax */
import { promises as fs } from 'fs';
import { debuglog } from 'util';
import { Database, Repack, RepackOptions } from './types';
import {
  asset, variant, Asset, Variant,
} from './variant.js';
import { match, doNothing } from './util.js';
import tsNode = require('ts-node');

import svg = require('./svg.js');
import js = require('./js.js');
import css = require('./css.js');
import img = require('./img.js');
import marko = require('./marko.js');
import watch = require('./watch.js');
import glob = require('fast-glob');

process.title = 'repack';

const debug = debuglog('repack');
const { readFile, writeFile } = fs;

const database: Database = {};

// Node.js can require() `.ts` files
if (Object.keys(require.extensions).indexOf('.ts') === -1) {
  tsNode.register({
    project: `${process.cwd()}/tsconfig.json`,
    transpileOnly: true,
    compilerOptions: { module: 'commonjs' },
  });
}

const buildConfig: Promise<Partial<RepackOptions>> = (async () => {
  try {
    return await import(`${process.cwd()}/etc/build.ts`);
  } catch (error) {
    process.emitWarning(`Using default config, because unable to load user config: ${error}`, 'BuildWarning');
    return {};
  }
})();

const repack = async (commandOptions?: Partial<RepackOptions>) => {
  const options: RepackOptions = {
    jsonFile: 'etc/assets.json',
    handlers: [
      [['jpg', 'png', 'webp', 'gif', 'avif'], img],
      [['svg'], svg],
      [['css'], css],
      [['js'], js],
      [['woff2', 'woff'], doNothing],
    ],
    src: ['**/*', '!**/node_modules'],
    destDir: 'web/s',
    baseUri: '/s',
    dev: false,
    run: async ({ glob, marko }: any) => {
      const configPath = `${process.cwd()}/etc/config.ts`;
      let config;
      try {
        config = await import(configPath);
      } catch (error) {
        config = {};
      }
      const templates = await glob(['tpl/**/*.marko', '!tpl/components/**/*']);
      Promise.all(templates
        .map((template: any) => marko()(template, config)));
    },
    watch: { ignore: [] },
    ...(await buildConfig),
    ...commandOptions,
  };
  options.watch.ignore = [
    ...options.watch.ignore,
    /node_modules/,
    /web\/html\//,
    /\.marko\.js$/,
    /web\/.+\.(?:br|gz)$/,
    new RegExp(`${options.destDir}$`),
    new RegExp(`${options.jsonFile}$`),
  ];

  const sourceGlob = glob(options.src);

  const read = async (file = options.jsonFile) => {
    try {
      const json = JSON.parse((await readFile(file)).toString()) as {
        [slug: string]: Asset | Variant
      };
      for (const [slug, payload] of Object.entries(json)) {
        if ('variant' in payload) {
          database[slug] = variant({ baseUri: options.baseUri, destDir: options.destDir })(payload);
        } else {
          database[slug] = asset(payload);
        }
      }
    } catch {
      // do nothing
    }
  };

  const save = async (file = options.jsonFile) => {
    // TODO sort
    await writeFile(file, JSON.stringify(
      await (async () => {
        const result = {};
        for (const [key, payload] of Object.entries(database)) {
          // eslint-disable-next-line no-await-in-loop
          result[key] = await payload;
        }
        return result;
      })(),
      null,
      2,
    ));
  };

  const repack: Repack = async (source: string, variantOptions = 'generic') => {
    debug(`repack('${source}', ${variantOptions})`);
    const srcSettled = await sourceGlob;
    const localFile = srcSettled.find(match(source));
    const sourceSlug = localFile || source;
    const variantString = typeof variantOptions === 'string' ? variantOptions : JSON.stringify(variantOptions);
    const variantSlug = `${sourceSlug}${variantString}`;
    debug(`const sourceSlug = ${sourceSlug}`);
    debug(`const variantString = ${variantString}`);
    debug(`const variantSlug = ${variantSlug}`);

    if (!(sourceSlug in database)) {
      database[sourceSlug] = asset({ source: sourceSlug });
    }

    if (variantSlug in database) {
      return database[variantSlug] as Promise<Variant>;
    }

    const sourceAsset = database[sourceSlug] as Promise<Asset>;
    let { type } = await sourceAsset;

    const [handler] = options.handlers
      .filter(([extensions]) => extensions.indexOf(type!) !== -1)
      .map(([, handler]) => handler);

    let data: Promise<Buffer>;
    let hash: string | undefined;

    if (!handler) {
      process.emitWarning(`No handler for “${source}”...treating as-is.`);
      data = (await sourceAsset).data;
    } else {
      const response = await handler(repack)(await sourceAsset, variantOptions);
      if (Buffer.isBuffer(response)) {
        data = Promise.resolve(response);
      } else if (typeof response === 'string') {
        data = Promise.resolve(Buffer.from(response));
      } else {
        data = response.data;
        type = response.type;
        hash = response.hash;
      }
    }

    database[variantSlug] = variant({ baseUri: options.baseUri, destDir: options.destDir })({
      source: sourceSlug,
      variant: variantOptions,
      type,
      hash,
      data,
    });

    return database[variantSlug] as Promise<Variant>;
  };

  repack.delete = async (filename: string) => {
    debug(`delete(filename = ${filename})`);
    const srcSettled = await sourceGlob;
    const localFile = srcSettled.find(match(filename));
    const normalizedFilename = localFile || filename;
    for (const key of Object.keys(database)) {
      if (key.indexOf(normalizedFilename) === 0) {
        debug(`delete: ${key}`);
        delete database[key];
      }
    }
  };

  repack.all = () => database;

  repack.run = () => options.run({
    svg: svg(repack),
    js: js(repack),
    css: css(repack),
    img: img(repack),
    marko: marko(repack),
    glob,
    repack,
  });

  repack.watch = () => { watch(repack, options.watch); };

  repack.options = options;

  read(options.jsonFile);

  process.on('beforeExit', async () => {
    await save();
    process.exit();
  });

  return repack;
};

// setInterval(() => {
//   console.log(Object.entries(process.memoryUsage())
//     .map(([key, val]) => `${key}: ${(~~(val / 1024 / 1024)).toLocaleString()} mb`).join('\t'));
// }, 1000).unref();

export = repack;
