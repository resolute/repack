import fs from 'fs';
import path from 'path';
import got from 'got';
import b64u from 'b64u';
import probe from 'probe-image-size';
import XxHash from 'xxhash';
import { RepackTypes, Handler } from './types';

const gotCache = new Map();

const bufferFromUInt32 = (number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(number, 0);
  return buffer;
};

export const xxhash = (data: Buffer) => {
  const buffer = typeof data === 'string' ? Buffer.from(data) : data;
  if (!buffer || !buffer.length) {
    throw new Error('empty/falsey data passed to be hashed');
  }
  const int32 = XxHash.hash(buffer, 0);
  // base64 character length:
  //    4*(n/3) chars to represent n bytes
  // and for a 4 byte (UInt32), that would be 5.333 chars,
  // which we’ll truncate to 5 chars to avoid padding:
  // @ts-ignore
  return b64u.encode(bufferFromUInt32(int32)).slice(0, 5);
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

export const dimensions = (data: Buffer, type?: RepackTypes) => {
  if (['svg', 'jpg', 'png', 'webp', 'gif'].indexOf(type as string) !== -1) {
    const { width, height } = probe.sync(data) as { width: number, height: number };
    return { width, height };
  }
  return {};
};

export const open = async (url: string) => {
  let type: RepackTypes | undefined;
  let data: Promise<Buffer>;
  try {
    if (/^https?:/.test(url)) {
      const { headers, body } = await got(url, { responseType: 'buffer', cache: gotCache });
      type = mimeToType(headers['content-type']);
      data = Promise.resolve(body);
    } else {
      data = fs.promises.readFile(url);
      type = extMap(path.parse(url).ext.replace(/^\./, ''));
    }
  } catch (error) {
    console.error(`FATAL: error trying to open “${url}”`);
    throw error;
  }
  const hash = xxhash(await data);

  return {
    data, hash, type, ...dimensions(await data, type),
  };
};

export const doNothing: Handler = (repack) => async (asset) => {
  if (asset.data) {
    return asset.data;
  }
  return open(asset.source);
};

declare const require: any;
export const deleteRequireCache = (regex: RegExp) => {
  Object.keys(require.cache).forEach((id) => {
    if (regex.test(id)) {
      console.log('deleting cache for module:', id);
      delete require.cache[id];
    }
  });
};
