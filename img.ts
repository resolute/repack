import rio from '@resolute/rio';
import type { Handler, RioOptions } from './types';

const img = (rioOptions?: Partial<RioOptions>): Handler => () => async (asset, options) => {
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
