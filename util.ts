import { promises as fs } from 'fs';

import path from 'path';
import axios from 'axios';
import * as rax from 'retry-axios';
import probe from 'probe-image-size';
import xxhash from 'xxhash-wasm';
import sharp from 'sharp';
import type { RepackTypes, Handler } from './types.js';

const { readFile } = fs;
rax.attach();

const cache: { [key: string]: Promise<{ headers: any, data: Buffer }> } = {};
const download = async (url: string) => {
  if (!(url in cache)) {
    // console.debug(`GET ${url}`);
    cache[url] = axios(url, { responseType: 'arraybuffer' })
      .then((response) => ({
        headers: response.headers,
        data: Buffer.from(response.data),
      }));
  }
  return cache[url];
};

// copy-and-paste from @resolute/rio/util.ts
const internalBtoa = 'btoa' in globalThis ? globalThis.btoa :
  ((input: string) =>
    globalThis.Buffer.from(input, 'binary').toString('base64'));

const bigIntToString = (input: bigint) => {
  let hex = input.toString(16);
  if (hex.length % 2) {
    hex = `0${hex}`;
  }
  return new Array(hex.length / 2)
    .fill(0)
    .map((_, index) => hex.slice(index * 2, index * 2 + 2))
    .map((d) => parseInt(d, 16))
    .map((d) => String.fromCharCode(d))
    .join('');
};

export const hash = async (input: string | Uint8Array) =>
  (await xxhash()).h64Raw(input as Uint8Array);

export const hashB64u = async (input: string | Uint8Array, limit?: number) => {
  const bigint = await hash(input);
  const string = bigIntToString(bigint);
  const b64 = internalBtoa(string);
  const b64u = b64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  if (limit && limit > 0) {
    return b64u.slice(0, limit);
  }
  return b64u;
};

export const mimeToType = (mime?: string) => {
  switch (mime) {
    case 'font/woff2': return 'woff2';
    case 'application/font-woff2': return 'woff2';
    case 'font/woff': return 'woff';
    case 'application/font-woff': return 'woff';
    case 'image/jpeg': return 'jpg';
    case 'image/png': return 'png';
    case 'image/svg+xml': return 'svg';
    case 'video/mp4': return 'mp4';
    default: return undefined;
  }
};

export const extMap = (str: string) => str.replace(/\bts$/, 'js').replace(/\bs[ca]ss$/, 'css') as RepackTypes;

export const match = (needle: string) => (haystack: string) => {
  // const matcher = new RegExp(`${filename}`);
  if (haystack.indexOf(needle) !== -1) {
    return true;
  }
  if (extMap(haystack).indexOf(needle) !== -1) {
    return true;
  }
  return false;
};

export const dimensions = async (data: Buffer, type?: RepackTypes) => {
  if (['svg', 'jpg', 'png', 'webp', 'gif'].indexOf(type as string) !== -1) {
    const { width, height } = probe.sync(data) as { width: number, height: number };
    return { width, height };
  }
  if (['avif'].indexOf(type as string) !== -1) {
    const { width, height } = await sharp(data).metadata();
    return { width, height };
  }
  return {};
};

export const open = async (url: string) => {
  let type: RepackTypes | undefined;
  let data: Promise<Buffer>;
  try {
    if (/^https?:/.test(url)) {
      // console.debug(`GET: ${url}`);
      const { headers, data: body } = await download(url);
      type = mimeToType(headers['content-type']);
      data = Promise.resolve(body);
    } else {
      // THIS IS NOT GOOD: IF WE ENCOUNTER AN ERROR, THEN IT’S UNHANDLED AND
      // THROWS AN UNCAUGHT EXCEPTION ERROR...NO NO NO NO REDO
      data = Promise.resolve(await readFile(url));
      type = extMap(path.parse(url).ext.replace(/^\./, ''));
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`FATAL: error trying to open “${url}”`);
    throw error;
  }

  return {
    data,
    hash: await hashB64u(await data),
    type,
    ...(await dimensions(await data, type)),
  };
};

const headCache: { [key: string]: Promise<Record<string, string>> } = {};
const head = async (url: string) => {
  if (!(url in headCache)) {
    // console.debug(`GET ${url}`);
    // @ts-ignore
    headCache[url] = axios(url, { method: 'HEAD' })
      .then((response) => ({ ...response.headers }));
  }
  return headCache[url];
};
export const getType = async (url: string) => {
  if (/^https?:/.test(url)) {
    // const { headers } = await got.head(url);
    const headers = await head(url);
    return mimeToType(headers['content-type']);
  }
  return extMap(path.parse(url).ext.replace(/^\./, ''));
};

// export const stream = (url: string) => {
//   let type: RepackTypes | undefined;
//   let data: Promise<Buffer>;
//   try {
//     if (/^https?:/.test(url)) {
//       const gotStream = got(url, { isStream: true });
//       gotStream.on('response', (response) => {
//         type = mimeToType(response.headers['content-type']);
//       });
//       data = Promise.resolve(body);
//     } else {
//       // THIS IS NOT GOOD: IF WE ENCOUNTER AN ERROR, THEN IT’S UNHANDLED AND
//       // THROWS AN UNCAUGHT EXCEPTION ERROR...NO NO NO NO REDO
//       data = readFile(url);
//       type = extMap(path.parse(url).ext.replace(/^\./, ''));
//     }
//   } catch (error) {
//     console.error(`FATAL: error trying to open “${url}”`);
//     throw error;
//   }
//   const hash = xxhash(await data);

//   return {
//     data, hash, type, ...(await dimensions(await data, type)),
//   };
// };

export const doNothing: Handler = (/* repack */) => async (asset) => {
  if (asset.data) {
    return asset.data;
  }
  return open(asset.source);
};

/**
 * debounce: Returns a function, that, as long as it continues to be
 * invoked (.), will not be triggered (*).  The function will be called
 * after it stops being called for `threshold` milliseconds.  If
 * `immediate` is passed, trigger the function on the leading edge,
 * instead of the trailing.
 *
 *       /-- 10s --\ /-- 10s --\ /-- 10s --\
 *     (*). . . . . . . . . . . .           *
 *
 * @param   function    fn          Function to be throttled
 * @param   number      threshold   Milliseconds fn will be throttled
 *
 * @return  function    Debounce’d function `fn`
 */

export const debounceAndAggregate =
  <T extends (...args: any[]) => any>(fn: T, threshold?: number) => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let aggregateArgs: Parameters<T>[0][0][] = [];

    return (...args: Parameters<T>[0][0]) => {
      aggregateArgs.push(args);

      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        timeout = undefined;
        fn.call(undefined, aggregateArgs);
        aggregateArgs = [];
      }, threshold);
    };
  };
