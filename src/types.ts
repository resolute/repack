import { Asset, Variant } from './variant.js';

import marko = require('./marko.js');

import glob = require('fast-glob');

export interface Database {
  [slug: string]: Promise<(Asset | Variant)>;
}

export interface WatchOptions {
  ignore: (string | RegExp)[];
}

export type RepackTypes = 'js' | 'ts' | 'scss' | 'svg' | 'css' | 'jpg' | 'png' | 'webp' | 'gif' | 'woff2' | 'woff';

export interface Handler {
  (repack: Repack): (asset: Asset, varientOptions: any) => Promise<Buffer | (Pick<Variant, 'data'> & Partial<Pick<Variant, 'type' | 'hash' | 'width' | 'height'>>)>;
}

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
  all: () => Database;
  delete: (filename: string) => Promise<void>;
  watch: () => void;
  options: RepackOptions;
}

export interface RepackOptions {
  jsonFile: string;
  handlers: HandlerList;
  src: string | string[];
  destDir: string;
  baseUri: string;
  dev: boolean;
  watch: WatchOptions;
  run: (runtime: RunOptions) => Promise<void>;
}
