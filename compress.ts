#!/usr/bin/env node

import { promises as fs, createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { cpus } from 'os';
import {
  createBrotliCompress, createBrotliDecompress, createGunzip,
} from 'zlib';

import pMap from 'p-map';
import zopfli from 'node-zopfli';
import glob from 'fast-glob';
import xxhash from 'xxhash';

const { stat, utimes, unlink } = fs;

const root = process.argv[2] || process.cwd();
const concurrency = cpus().length;
const pipe = promisify(pipeline);
const minSize = 1300;
const extensions = ['js', 'html', 'css', 'json', 'xml', 'csv', 'eot', 'svg', 'ttf', 'ico'];
const globPatterns = extensions.map((extension) => `${root}/**/*.${extension}`);

const hasher = async (
  readStream: NodeJS.ReadableStream,
  ...rwStreams: NodeJS.ReadWriteStream[]
) => {
  const hashStream = new xxhash.Stream(0) as NodeJS.WritableStream;
  // @ts-ignore
  await pipe(readStream, ...rwStreams, hashStream);
  // @ts-ignore
  return hashStream.read() as number;
};

type Compression = typeof zopfli.createGzip | typeof createBrotliCompress;
type Decompression = typeof createGunzip | typeof createBrotliDecompress;
const compress = async (
  compression: Compression,
  decompression: Decompression,
  input: string,
  output: string,
  mtime: Date,
  size: number,
  hash: number,
) => {
  try {
    // await access(output, fs.constants.F_OK);
    const { size: compressedSize } = await stat(output);
    const compressedHash = await hasher(createReadStream(output), decompression());
    if (hash === compressedHash) {
      await utimes(output, mtime, mtime);
      console.log(`✓ ${output} ${((100 * compressedSize) / size).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`);
      return;
    }
  } catch {
    //
  }
  await pipe(createReadStream(input), compression(), createWriteStream(output));
  const { size: compressedSize } = await stat(output);
  if (compressedSize > size) {
    process.emitWarning(`! ${output} is larger than ${input}, deleting...`, 'CompressWarning');
    await unlink(output);
  } else {
    await utimes(output, mtime, mtime);
    console.log(`c ${output} ${((100 * compressedSize) / size).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`);
  }
};

const main = async (path: string) => {
  const { mtime, size } = await stat(path);
  if (size <= minSize) {
    console.log(`! ${path}: less than ${minSize.toLocaleString()} bytes, skipping...`);
    return;
  }
  const hash = await hasher(createReadStream(path));
  await compress(createBrotliCompress, createBrotliDecompress, path, `${path}.br`, mtime, size, hash);
  await compress(zopfli.createGzip, createGunzip, path, `${path}.gz`, mtime, size, hash);
};

(async () => {
  pMap(await glob(globPatterns), main, { concurrency });
})();
