/* eslint-disable @typescript-eslint/no-shadow */
import { debuglog } from 'util';
import path from 'path';
import glob from 'fast-glob';
import * as tsNode from 'ts-node';
import rio from '@resolute/rio';
import type {
  Database, Repack, RepackOptions, RepackTypes,
} from './types.js';
import {
  asset, variant, Asset, Variant,
} from './variant.js';
import { match, doNothing } from './util.js';

import svg from './svg.js';
import js from './js.js';
import css from './css.js';
import img from './img.js';
import marko from './marko.js';
import watch from './watch.js';

process.title = 'repack';

const debug = debuglog('repack');
// const { readFile, writeFile } = fs;

const database: Database = {};

// Node.js can require() `.ts` files
if (Object.keys(require.extensions).indexOf('.ts') === -1) {
  tsNode.register({
    project: `${process.cwd()}/tsconfig.json`,
    transpileOnly: true,
    compilerOptions: { module: 'commonjs' },
    preferTsExts: true,
  });
}

const buildConfig: Promise<Partial<RepackOptions>> = (async () => {
  try {
    return await import(path.join(process.cwd(), 'etc/build'));
  } catch (error) {
    process.emitWarning(`Using default config, because unable to load user config: ${error}`, 'BuildWarning');
    return {};
  }
})();

const repack = async (commandOptions?: Partial<RepackOptions>) => {
  const rioOptions = commandOptions?.rio ?? (await buildConfig).rio;
  const options: RepackOptions = {
    jsonFile: 'etc/assets.json',
    handlers: [
      [['jpg', 'png', 'webp', /* TODO: 'gif' ,*/ 'avif', 'heif', 'jpeg'], img(rioOptions)],
      [['svg'], svg],
      [['css'], css],
      [['js'], js],
      [['woff2', 'woff', 'pdf', 'mp4'], doNothing],
    ],
    src: ['**/*', '!**/node_modules'],
    destDir: 'web/s',
    baseUri: '/s',
    dev: false,
    rio: {},
    run: async ({ glob, marko }: any) => {
      const configPath = path.join(process.cwd(), 'etc/config');
      let config;
      try {
        // config = await import(`${configPath}`);
        // eslint-disable-next-line import/no-dynamic-require
        // config = await require(`${configPath}`);
        config = await import(`${configPath}`);
      } catch (error) {
        process.emitWarning(`Unable to read “etc/config.(j|t)s”. ${error} Continuing…`);
        config = {};
      }
      for (const template of await glob(['tpl/**/*.marko', '!tpl/components/**/*'])) {
        marko()(template, config);
      }
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
    let filename: string | undefined;
    let width: number | undefined;
    let height: number | undefined;
    let variantType: RepackTypes | undefined;

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
        // @ts-ignore
        filename = response.filename;
        width = response.width;
        height = response.height;
        variantType = response.type;
      }
    }

    database[variantSlug] = variant({ baseUri: options.baseUri, destDir: options.destDir })({
      source: sourceSlug,
      variant: variantOptions,
      // type,
      hash,
      data,
      filename,
      width,
      height,
      type: variantType ?? type,
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

  repack.run = async () => {
    await options.run({
      svg: svg(repack),
      js: js(repack),
      css: css(repack),
      img: img(options.rio)(repack),
      marko: marko(repack),
      glob,
      repack,
    });
    return rio().stats;
  };

  repack.watch = () => { watch(repack, options.watch); };

  repack.options = options;

  // read(options.jsonFile);

  // process.on('beforeExit', async () => {
  //   await save();
  //   process.exit();
  // });

  return repack;
};

// setInterval(() => {
//   console.log(Object.entries(process.memoryUsage())
//     .map(([key, val]) => `${key}: ${(~~(val / 1024 / 1024)).toLocaleString()} mb`).join('\t'));
// }, 1000).unref();

export default repack;
