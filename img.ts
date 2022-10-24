import rio from '@resolute/rio';
import { RioConfig } from '@resolute/rio/types';
import type { Handler } from './types';

const img = (rioOptions?: Partial<RioConfig>): Handler => () => async (asset, options) => {
  const {
    width, height, type, buffer, hash, filename,
    // @ts-ignore
  } = await (rio.default ?? rio)(rioOptions)(asset.source, {
    ...options,
    type: options.type ?? options.format,
  });
  return {
    width, height, type, data: buffer(), hash, filename,
  };
};
export default img;
