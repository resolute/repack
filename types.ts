import glob from 'fast-glob';
import rio from '@resolute/rio';
import { Asset, Variant } from './variant.js';
import marko from './marko.js';

export type RioOptions = NonNullable<Parameters<typeof rio>[0]>;
export type ImageOptions = NonNullable<Parameters<ReturnType<typeof rio>>[1]>;
export type ImageTypes = NonNullable<ImageOptions['type']>;

export interface Database {
  [slug: string]: Promise<(Asset | Variant)>;
}

export interface WatchOptions {
  ignore: (string | RegExp)[];
}

export type RepackTypes = 'js' | 'ts' | 'scss' | 'svg' | 'css' | 'mp4' | 'woff2' | 'woff' | 'pdf' | ImageTypes;

export interface Repack {
  (source: string, variantOptions?: any): Promise<Variant>;
  run: () => Promise<ReturnType<typeof rio>['stats']>;
  all: () => Database;
  delete: (filename: string) => Promise<void>;
  watch: () => void;
  // eslint-disable-next-line no-use-before-define
  options: RepackOptions;
}

export interface Handler {
  (repack: Repack, handlerOptions?: any): (asset: Asset, variantOptions: any) => Promise<Buffer | (Pick<Variant, 'data'> & Partial<Pick<Variant, 'type' | 'hash' | 'width' | 'height'>>)>;
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

export interface RepackOptions {
  jsonFile: string;
  handlers: HandlerList;
  src: string | string[];
  destDir: string;
  baseUri: string;
  dev: boolean;
  watch: WatchOptions;
  rio: RioOptions;
  run: (runtime: RunOptions) => Promise<void>;
}
