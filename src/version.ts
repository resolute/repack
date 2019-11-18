/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */
import { VersionParams } from './types';

import fs = require('fs');
import path = require('path');
// import util = require('util');
import b64u = require('b64u');
import XxHash = require('xxhash');

const bufferFromUInt32 = (number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(number, 0);
  return buffer;
};

class Version {
  public filename: string;
  public ext: string;
  public data: Buffer | string;
  public hash: string;
  public destUri: string;
  public destDir: string;
  public width?: number;
  public height?: number;
  constructor({
    filename,
    ext,
    data,
    hash,
    destUri,
    destDir,
    width,
    height,
  }: VersionParams) {
    this.filename = filename;
    this.ext = ext;
    this.data = data;
    if (hash) {
      this.hash = hash;
    } else {
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
      this.hash = b64u.encode(bufferFromUInt32(int32)).slice(0, 5);
    }
    this.destUri = destUri;
    this.destDir = destDir;
    if (width) {
      this.width = width;
    }
    if (height) {
      this.height = height;
    }
    this.write();
  }
  // eslint-disable-next-line class-methods-use-this
  public toJSON() {
    return {
      filename: this.filename,
      // data: this.data,
      ext: this.ext,
      hash: this.hash,
      destUri: this.destUri,
      destDir: this.destDir,
      uri: this.uri,
      dir: this.dir,
      width: this.width,
      height: this.height,
    };
  }

  public json() {
    return this.toJSON();
  }

  public get path() {
    return path.parse(this.filename);
  }

  public async write() {
    await fs.promises.mkdir(path.dirname(this.dir), { recursive: true });
    return fs.promises.writeFile(this.dir, this.data);
  }

  private get dir() {
    return path.join(this.destDir, this.hash + this.ext);
  }

  public get uri() {
    return path.join(this.destUri, this.hash + this.ext);
  }
}

// const version = async ({
//   filename,
//   ext,
//   payload,
//   destUri = 's',
//   destDir = 'web/s',
// }: Omit<VersionParams, 'hash' | 'data'> & { payload: Promise<Payload> | Payload }) => {
//   let settled: Payload;
//   if (util.types.isPromise(payload)) {
//     settled = await payload;
//   } else {
//     settled = payload as { data: VersionParams['data'], ext: VersionParams['ext'] };
//   }
//   const buffer = typeof settled.data === 'string' ? Buffer.from(settled.data) : settled.data;
//   if (!buffer || !buffer.length) {
//     throw new Error('empty/falsey data passed to be hashed');
//   }
//   const int32 = XxHash.hash(buffer, 0);
//   // base64 character length:
//   //    4*(n/3) chars to represent n bytes
//   // and for a 4 byte (UInt32), that would be 5.333 chars,
//   // which we’ll truncate to 5 chars to avoid padding:
//   // @ts-ignore
//   const hash = b64u.encode(bufferFromUInt32(int32)).slice(0, 5);
//   return new Version({
//     filename,
//     ext: settled.ext,
//     data: settled.data,
//     hash,
//     destUri,
//     destDir,
//     width: settled.width,
//     height: settled.height,
//   });
// };
// version.Version = Version;
// version.extMap = extMap;

export = Version;
