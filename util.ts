import { promises as fs } from 'fs';

import path from 'path';
import got from 'got';
import probe from 'probe-image-size';
import XxHash from 'xxhash';
import sharp from 'sharp';
import type { RepackTypes, Handler } from './types.js';

const { readFile } = fs;

const gotCache = new Map();

export const xxhash = (data: Buffer) => {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  if (!buffer || !buffer.length) {
    throw new Error('empty/falsey data passed to be hashed');
  }
  return (XxHash.hash64(buffer, 0, 'base64') as string)
    // b64u:
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    // base64 character length:
    //    4*(n/3) chars to represent n bytes
    // and for a 8 byte integer, that would be 10.6667 chars,
    // which we’ll truncate to 5 chars to avoid padding:
    .slice(0, 5);
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
      console.debug(`GOT: ${url}`);
      const { headers, body } = await got(url, { responseType: 'buffer', cache: gotCache });
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
  const hash = xxhash(await data);

  return {
    data, hash, type, ...(await dimensions(await data, type)),
  };
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
