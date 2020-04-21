/* eslint-disable no-restricted-syntax */
import fs from 'fs';
import { register } from 'ts-node';
import glob from 'fast-glob';
import svg from './svg';
import js from './js';
import css from './css';
import img from './img';
import marko from './marko';
import watch, { WatchOptions } from './watch';
import {
  asset, variant, Asset, Variant,
} from './variant';
import { match, doNothing } from './util';
import { Handler, RepackTypes } from './types';

export type HandlerList = [RepackTypes[], Handler][];

export interface RunOptions {
  svg: ReturnType<Handler>;
  js: ReturnType<Handler>;
  css: ReturnType<Handler>;
  img: ReturnType<Handler>;
  marko: ReturnType<typeof marko>;
  glob: typeof glob;
  repack: Repack;
}

export interface Repack {
  (source: string, variantOptions?: any): Promise<Variant>;
  run: () => Promise<void>;
  all: () => typeof database;
  delete: (filename: string) => Promise<void>;
  watch: () => void;
}

export interface RepackOptions {
  jsonFile: string;
  handlers: HandlerList;
  src: string | string[];
  destDir: string;
  baseUri: string;
  watch: WatchOptions;
  run: (runtime: RunOptions) => Promise<void>;
}

const database: { [slug: string]: Promise<(Asset | Variant)> } = {};

if (Object.keys(require.extensions).indexOf('.ts') === -1) {
  // Node.js can require() `.ts` files
  register({
    project: `${process.cwd()}/tsconfig.json`,
    transpileOnly: true,
  });
}

const buildConfig: Promise<Partial<RepackOptions>> =
  import(`${process.cwd()}/etc/build`)
    .then((config) => {
      if ('default' in config) {
        return config.default;
      }
      return config;
    })
    .catch(() => {
      process.emitWarning('No etc/build.ts found, using defaults.', 'BuildWarning');
      return {};
    });

export default async (commandOptions?: RepackOptions) => {
  const options: RepackOptions = {
    jsonFile: 'etc/assets.json',
    handlers: [
      [['jpg', 'png', 'webp', 'gif'], img],
      [['svg'], svg],
      [['css'], css],
      [['js'], js],
      [['woff2', 'woff'], doNothing],
    ],
    src: ['**/*', '!**/node_modules'],
    destDir: 'web/s',
    baseUri: '/s',
    run: async ({ glob, marko }: any) => {
      const config = await import(`${process.cwd()}/etc/config`).catch(() => ({}));
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
      const json = JSON.parse((await fs.promises.readFile(file)).toString()) as {
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
    await fs.promises.writeFile(file, JSON.stringify(
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
    // console.debug(`asset.ts: repack('${source}', ${variantObject})`);
    const srcSettled = await sourceGlob;
    const localFile = srcSettled.find(match(source));
    const sourceSlug = localFile || source;
    // console.debug(sourceSlug, variantObject);
    const variantString = typeof variantOptions === 'string' ? variantOptions : JSON.stringify(variantOptions);
    const variantSlug = `${sourceSlug}${variantString}`;

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
    // console.debug(`del requested: ${filename}`);
    const srcSettled = await sourceGlob;
    const localFile = srcSettled.find(match(filename));
    const normalizedFilename = localFile || filename;
    for (const key of Object.keys(database)) {
      if (key.indexOf(normalizedFilename) === 0) {
        console.debug(`DELETE ${key}`);
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
