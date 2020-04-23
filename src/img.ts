import sharp from 'sharp';
import imagemin from 'imagemin';
import imageminJpegtran from 'imagemin-jpegtran';
import imageminMozjpeg from 'imagemin-mozjpeg';
import imageminPngquant from 'imagemin-pngquant';
import imageminWebp from 'imagemin-webp';
import { Handler } from '.';

const isFinite = (num: any): num is number => {
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return true;
  }
  return false;
};

const normalizeDimensions = (original: any = {}, target: any = {}) => {
  const { width: targetWidth, height: targetHeight, ...nonWidthHeightOptions } = target;
  if (isFinite(target.width) && isFinite(target.height)) {
    if (target.width <= original.width && target.height <= original.height) {
      return { width: target.width, height: target.height, ...nonWidthHeightOptions };
    }
    const targetAspect = target.width / target.height;
    const originalAspect = original.width / original.height;
    // one of the target dimensions is higher than the original, so we must find
    // the largest box with targetAspect that will fit in the original:
    let resolvedWidth = original.width;
    let resolvedHeight = original.height;
    if (originalAspect > targetAspect) {
      resolvedWidth = Math.floor(original.height * targetAspect);
    }
    if (originalAspect < targetAspect) {
      resolvedHeight = Math.floor(original.width / targetAspect);
    }
    return {
      width: resolvedWidth,
      height: resolvedHeight,
      ...nonWidthHeightOptions,
    };
  }
  let width: number;
  let height: number;
  // eslint-disable-next-line prefer-const
  let { width: w, height: h, ...other } = target;
  w = Number(w);
  h = Number(h);
  if (isFinite(w)) {
    width = w;
  }
  if (isFinite(h)) {
    height = h;
  }
  // @ts-ignore
  return { width, height, ...other };
};

const img: Handler = (repack) => async (input, variant) => {
  const { format: targetFormat, ...options } = variant;
  const original = sharp(await input.data);
  const { width, height, format: originalFormat } = await original.metadata();
  // console.debug(`original width x height ${width} x ${height} format: ${originalFormat}`);
  let image = original;
  if (options.width || options.height) {
    image = image.resize({
      ...normalizeDimensions({ width, height }, options),
      withoutEnlargement: true,
    });
  }
  // TODO test for valid formats
  if (targetFormat) {
    image = image.toFormat(targetFormat);
  }
  let { type } = input;
  // console.debug(`repack.options.dev = ${repack.options.dev}`);
  if (repack.options.dev) {
    // console.debug('skipping optimization');
    return { type, data: image.toBuffer() };
  }
  const buffer = await image.toBuffer();
  let data: Promise<Buffer>;
  switch (targetFormat || originalFormat) {
    case 'jpeg':
    case 'jpg':
      type = 'jpg';
      data = imagemin.buffer(buffer, {
        plugins: [
          imageminJpegtran(),
          imageminMozjpeg(),
        ],
      });
      break;
    case 'png':
      type = 'png';
      data = imagemin.buffer(buffer, {
        plugins: [
          imageminPngquant({
            quality: [0.6, 0.8],
          })],
      });
      break;
    case 'webp':
      type = 'webp';
      data = imagemin.buffer(buffer, {
        plugins: [
          imageminWebp(),
        ],
      });
      break;
    default:
      data = Promise.resolve(buffer);
      break;
  }
  return { type, data };
};

export default img;
