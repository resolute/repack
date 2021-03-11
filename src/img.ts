// eslint-disable-next-line import/order
import { Handler } from './types';
import sharp = require('sharp');
import imagemin = require('imagemin');
import imageminJpegtran = require('imagemin-jpegtran');
import imageminMozjpeg = require('imagemin-mozjpeg');
// import imageminPngquant = require('imagemin-pngquant');
// import imageminWebp = require('imagemin-webp');

const isFinite = (num: any): num is number => {
  if (!Number.isNaN(num) && Number.isFinite(num)) {
    return true;
  }
  return false;
};

const normalizeDimensions = (original: any = {}, target: any = {}) => {
  if (isFinite(target.width) && isFinite(target.height)) {
    if (target.width <= original.width && target.height <= original.height) {
      return target;
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
      ...target,
      width: resolvedWidth,
      height: resolvedHeight,
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
    switch (targetFormat) {
      case 'avif':
        image = image.toFormat(targetFormat, { quality: 70 });
        break;
      case 'webp':
        image = image.toFormat(targetFormat, { quality: 85 /* , smartSubsample: true */ });
        break;
      default:
        image = image.toFormat(targetFormat);
        break;
    }
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
      data = Promise.resolve(buffer);
      // data = imagemin.buffer(buffer, {
      //   plugins: [
      //     (imageminPngquant.default || imageminPngquant)({
      //       quality: [0.6, 0.8],
      //     })],
      // });
      break;
    case 'webp':
      type = 'webp';
      data = Promise.resolve(buffer);
      // data = imagemin.buffer(buffer, {
      //   plugins: [
      //     imageminWebp(),
      //   ],
      // });
      break;
    case 'avif':
      type = 'avif';
      data = Promise.resolve(buffer);
      break;
    default:
      data = Promise.resolve(buffer);
      break;
  }
  return { type, data };
};

export = img;
