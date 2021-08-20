import rio from '@resolute/rio';
import type { Handler } from './types';

const img: Handler = () => async (asset, options) => {
  const {
    width, height, type, buffer, hash, filename,
    // @ts-ignore
  } = await (rio.default ?? rio)()(asset.source, {
    ...options,
    type: options.type ?? options.format,
  });
  return {
    width, height, type, data: buffer(), hash, filename,
  };
};

export default img;
