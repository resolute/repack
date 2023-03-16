import glob from 'fast-glob';
import rio from '@resolute/rio';
import { Asset, Variant } from './variant.js';
import marko from './marko.js';
import { JsOptions } from './js.js';

// export type RioOptions = NonNullable<Parameters<typeof rio>[0]>;
// export type ImageOptions = NonNullable<Parameters<ReturnType<typeof rio>>[1]>;
// export type ImageTypes = NonNullable<ImageOptions['type']>;

// TODO

// For now, just copying-and-pasting from @resolute/rio and
// @resolute/std...authoring Node packages is a nightmare.

// -- begin paste --

export type MimeTypes = keyof typeof mimeDatabase;

export type MimeExtensions = keyof typeof extDatabase;

const mimeDatabase = {
  'text/html': ['html'],
  'text/plain': ['txt'],
  'text/css': ['css'],
  'application/javascript': ['js'],
  'application/pdf': ['pdf'],
  'font/woff': ['woff'],
  'font/woff2': ['woff2'],
  'video/mp4': ['mp4'],
  'image/avif': ['avif', 'heif'], // libvips reports "avif" as "heif"
  'image/webp': ['webp'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/svg+xml': ['svg'],
  'image/vnd.microsoft.icon': ['ico'],
} as const;

const extDatabase = Object.fromEntries(
  [...Object.entries(mimeDatabase)]
    .map(([mimetype, extensions]) =>
      extensions
        .map((extension) => [extension, mimetype as MimeTypes] as const)).flat(),
) as { [K in MimeTypes as (typeof mimeDatabase)[K][number]]: K };

export interface RioOptions {
  cacheDirectory: string;
  cachePrefix: string;
  remote?: string;
}
export interface ImageOptions { // extends sharp.ResizeOptions {
  type: MimeExtensions;
  width: number;
  height: number;
  fit: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  position: typeof Positions[keyof typeof Positions];
  quality: number;
}

export type ImageTypes = MimeExtensions;
export const Positions = {
  center: 'center', // 0
  centre: 'center', // 0
  top: 'top', // 1
  north: 'top', // 1
  right: 'right', // 2
  east: 'right', // 2
  bottom: 'bottom', // 3
  south: 'bottom', // 3
  left: 'left', // 4
  west: 'left', // 4
  'right top': 'right top', // 5
  northeast: 'right top', // 5
  'right bottom': 'right bottom', // 6
  southeast: 'right bottom', // 6
  'left bottom': 'left bottom', // 7
  southwest: 'left bottom', // 7
  'left top': 'left top', // 8
  northwest: 'left top', // 8
  entropy: 'entropy', // 16
  attention: 'attention', // 17
} as const;

// -- end paste --
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
  rio?: Partial<RioOptions>;
  js?: Partial<JsOptions>;
  run: (runtime: RunOptions) => Promise<void>;
}
