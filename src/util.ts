/* eslint-disable import/prefer-default-export */
/* eslint-disable no-underscore-dangle */
// import { PathLike } from 'fs';

// import fs = require('fs');
// import path = require('path');
// import crypto = require('crypto');
// import glob = require('fast-glob');
// import b64u = require('b64u');
// import XxHash = require('xxhash');

// const { readFile, writeFile, mkdir } = fs.promises;

// const bufferFromUInt32 = (number) => {
//   const buffer = Buffer.alloc(4);
//   buffer.writeUInt32BE(number, 0);
//   return buffer;
// };

// export const mkdirp = (path: PathLike) => mkdir(path, { recursive: true });
// export const unique = (val, index, arr) => arr.indexOf(val) === index;
// export const flatten = (acc, val) => acc.concat(val);

// export const each = <T>(pattern, opts, fn: (arg) => T = (arg) => arg) => {
//   const callback: (arg) => T = typeof opts === 'function' ? opts : fn;
//   const base = opts && opts.cwd && opts.cwd.replace(/\/$/, '');
//   return glob(pattern, opts).then((files) => Promise.all(files.map((file) =>
//     readFile(base ? `${base}/${file}` : file.toString())
//       .then((content) => ({ file, content, base }))
//       .then(callback))));
// };

// export const hash = ({
//   file,
//   buffer,
//   ext,
//   dir,
//   uri,
//   inline = false,
//   sep = '.',
// }) => {
//   const basename = file.match(/([^/.]+?)\.?[^/.]*$/)[1];
//   // @ts-ignore
//   const hash = b64u.encode(crypto.createHash('md5').update(buffer).digest()).slice(0, 7);
//   // const hashPath = `${basename + sep + hash}.${ext}`;
//   const hashPath = `${hash}.${ext}`;
//   const asset = {};
//   if (inline) {
//     // eslint-disable-next-line no-new-wrappers
//     asset[`${basename}.${ext}`] = new String(buffer);
//     asset[`${basename}.${ext}`].inline = true;
//   } else {
//     asset[`${basename}.${ext}`] = `${uri}/${hashPath}`;
//   }
//   if (!inline) {
//     return mkdirp(dir)
//       .then(() => writeFile(`${dir}/${hashPath}`, buffer))
//       .then(() => asset);
//   }
//   return Promise.resolve(asset);
// };


declare const require: any;
export const deleteRequireCache = (regex: RegExp) => {
  Object.keys(require.cache).forEach((id) => {
    if (regex.test(id)) {
      console.log('deleting cache for module:', id);
      delete require.cache[id];
    }
  });
};

// export class Version {
//   public destUri: string;
//   public destDir: string;
//   private _data: Buffer | string;
//   private _hash?: string;
//   private _filename?: string;
//   constructor({
//     filename,
//     data,
//     hash,
//     destUri = 's',
//     destDir = 'web/s',
//   }: {
//     filename: string,
//     data: Buffer | string,
//     hash?: string,
//     destUri: string,
//     destDir: string,
//   }) {
//     this._filename = filename;
//     this._data = data;
//     this.destUri = destUri;
//     this.destDir = destDir;
//     if (hash) {
//       this.hash = hash;
//     }
//   }
//   public toJSON() {
//     return {
//       filename: this._filename,
//       data: this._data,
//       hash: this.hash,
//       destUri: this.destUri,
//       destDir: this.destDir,
//     };
//   }

//   public get filename() {
//     if (!this._filename) {
//       throw new Error('filename undefined');
//     }
//     return this._filename;
//   }

//   public set filename(filename) {
//     this._filename = filename;
//   }

//   public get path() {
//     return path.parse(this.filename);
//   }

//   public async write() {
//     await fs.promises.mkdir(path.dirname(this.dir), { recursive: true });
//     return fs.promises.writeFile(this.dir, this._data);
//   }

//   private get dir() {
//     return path.join(this.destDir, this.hash + this.path.ext);
//   }

//   public get uri() {
//     return path.join(this.destUri, this.hash + this.path.ext);
//   }

//   public get data() {
//     return this._data;
//   }

//   public set data(data) {
//     this._data = data;
//     this._hash = undefined;
//   }

//   public get hash() {
//     if (typeof this._hash === 'undefined') {
//       const buffer = typeof this.data === 'string' ? Buffer.from(this.data) : this.data;
//       const int32 = XxHash.hash(buffer, 0);
//       // base64 character length:
//       //    4*(n/3) chars to represent n bytes
//       // and for a 4 byte (UInt32), that would be 5.333 chars,
//       // which we’ll truncate to 5 chars to avoid padding:
//       // @ts-ignore
//       this._hash = b64u.encode(bufferFromUInt32(int32)).slice(0, 5);
//     }
//     return this._hash!;
//   }

//   public set hash(hash: string) {
//     this._hash = hash;
//   }
// }
