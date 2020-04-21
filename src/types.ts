import { Variant, Asset } from './variant';
import { Repack } from '.';

// export { Watcher } from 'sane';

export type RepackTypes = 'js' | 'ts' | 'scss' | 'svg' | 'css' | 'jpg' | 'png' | 'webp' | 'gif' | 'woff2' | 'woff';

export interface Handler {
  (repack: Repack): (asset: Asset, varientOptions: any) => Promise<Buffer | (Pick<Variant, 'data'> & Partial<Pick<Variant, 'type' | 'hash' | 'width' | 'height'>>)>;
}
