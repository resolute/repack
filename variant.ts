/* eslint-disable max-classes-per-file */
/* eslint-disable no-underscore-dangle */
import { promises as fs } from 'fs';
import path from 'path';
import {
  open, xxhash, dimensions as getDimensions, getType,
} from './util.js';
import type { RepackTypes } from './types.js';

const {
  mkdir, writeFile, access, link: hardlink,
} = fs;

export class Asset {
  public source: string; // url or filename
  public hash?: string;
  public type?: RepackTypes;
  public width?: number;
  public height?: number;
  protected _data?: Promise<Buffer>;

  constructor({
    source, type, hash, width, height, data,
  }: Omit<Asset, 'data' | 'toJSON'> & { data?: Asset['data'] | Buffer }) {
    this.source = source;
    this.type = type;
    this.hash = hash;
    this.width = width;
    this.height = height;
    if (Buffer.isBuffer(data)) {
      this.data = Promise.resolve(data);
    } else if (typeof data !== 'undefined') {
      this.data = data;
    }
  }

  public get data() {
    if (typeof this._data === 'undefined') {
      this._data = open(this.source).then(({ data }) => data);
    }
    return this._data;
  }

  public set data(data) {
    if (Buffer.isBuffer(data)) {
      this._data = Promise.resolve(data);
    }
    this._data = data;
  }

  public toJSON() {
    return {
      source: this.source,
      hash: this.hash,
      type: this.type,
      width: this.width,
      height: this.height,
    };
  }
}

export class Variant extends Asset {
  public variant: string;
  public destDir: string;
  public baseUri: string;
  public hash: string;
  constructor({
    variant,
    destDir,
    baseUri,
    ...options
  }: Omit<Variant, 'data' | 'uri' | 'toJSON' | 'localFilePath'> & { data?: Variant['data'] | Buffer } & { hash: string }) {
    super(options);
    this.hash = options.hash;
    this.variant = variant;
    this.destDir = destDir;
    this.baseUri = baseUri;
  }
  public get data() {
    if (typeof this._data === 'undefined') {
      this._data = open(this.localFilePath).then(({ data }) => data);
    }
    return this._data;
  }
  public set data(data) {
    super.data = data;
  }
  public get uri() {
    return path.join(this.baseUri, this.hashBasename);
  }
  protected get hashBasename() {
    if (this.type) {
      return `${this.hash}.${this.type}`;
    }
    return this.hash;
  }
  public get localFilePath() {
    return path.join(this.destDir, this.hashBasename);
  }
  public toJSON() {
    return {
      ...super.toJSON(),
      variant: this.variant,
    };
  }
}

export type AssetFromCache = Pick<Asset, 'source' | 'hash'> & Partial<Pick<Asset, 'type' | 'width' | 'height'>>;
export type AssetFromFresh = Pick<Asset, 'source'> & Partial<Pick<Asset, 'type' | 'width' | 'height'>>;
export interface AssetInitializer {
  (input: AssetFromCache | AssetFromFresh): Promise<Asset>;
}

export interface VariantConfig {
  destDir: Variant['destDir'];
  baseUri: Variant['baseUri'];
}

export type VariantFromCache = Pick<Variant, 'source' | 'variant' | 'hash'> & Partial<Pick<Variant, 'type' | 'width' | 'height'>>;
export type VariantFromFresh = Pick<Variant, 'source' | 'variant' | 'data'> & Partial<Pick<Variant, 'type' | 'width' | 'height'>>;
export interface VariantInitializer {
  (input: (VariantFromCache | VariantFromFresh) & { filename?: string }): Promise<Variant>;
}

export interface VariantFactory {
  (config: VariantConfig): VariantInitializer;
}

const isFromCache = <T extends VariantFromCache | AssetFromCache>(input: any): input is T => {
  if ('hash' in input && typeof input.hash !== 'undefined') {
    return true;
  }
  return false;
};

export const asset: AssetInitializer = async (input) => {
  if (isFromCache(input)) {
    return new Asset(input);
  }
  // return new Asset({ source: input.source, ...await open(input.source) });
  return new Asset({ source: input.source, type: await getType(input.source) });
};

export const variant: VariantFactory = (config) => async (input) => {
  if (isFromCache(input)) {
    if (typeof input.filename === 'string') {
      const hash = input.hash.slice(0, 5);
      const result = new Variant({
        ...config, ...input, hash,
      });
      try {
        await access(result.localFilePath);
      } catch (error) {
        await mkdir(config.destDir, { recursive: true });
        await hardlink(input.filename, result.localFilePath).catch(() => { });
      }
      return result;
    }
    return new Variant({ ...config, ...input });
  }
  const data = Buffer.from(await input.data);
  let hash;
  try {
    hash = xxhash(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.debug('EMPTY DATA');
    // eslint-disable-next-line no-console
    console.dir(input);
    throw error;
  }
  const dimensions = input.width && input.height
    ? { width: input.width, height: input.height }
    : await getDimensions(data, input.type);
  const result = new Variant({
    ...config, ...input, hash, ...dimensions,
  });
  await mkdir(config.destDir, { recursive: true });
  await writeFile(result.localFilePath, await result.data);
  return result;
};
