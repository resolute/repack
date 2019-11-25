import fs = require('fs');
import probe = require('probe-image-size');
import sharp = require('sharp');
import imagemin = require('imagemin');
import imageminJpegtran = require('imagemin-jpegtran');
import imageminMozjpeg = require('imagemin-mozjpeg');
import imageminPngquant = require('imagemin-pngquant');
import imageminWebp = require('imagemin-webp');

const normalizeDimensions = (options: any = {}) => {
  let width: number;
  let height: number;
  // eslint-disable-next-line prefer-const
  let { width: w, height: h, ...other } = options;
  w = Number(w);
  h = Number(h);
  if (!Number.isNaN(w) && Number.isFinite(w)) {
    width = w;
  }
  if (!Number.isNaN(h) && Number.isFinite(h)) {
    height = h;
  }
  // @ts-ignore
  return { width, height, ...other };
};

const img = (asset) => async (input, variant) => {
  const { filename, data } = input;
  let { ext } = input;
  const { format: targetFormat, ...options } = variant;
  const original = sharp(data || await fs.promises.readFile(filename));
  const { width, height, format: originalFormat } = await original.metadata();
  // console.debug(`original width x height ${width} x ${height} format: ${originalFormat}`);
  let image = original;
  let buffer: Buffer;
  if (options.width || options.height) {
    image = image.resize({ ...normalizeDimensions(options), withoutEnlargement: false });
  }
  // TODO test for valid formats
  if (targetFormat) {
    image = image.toFormat(targetFormat);
  }
  buffer = await image.toBuffer();
  switch (targetFormat || originalFormat) {
    case 'jpeg':
    case 'jpg':
      ext = '.jpg';
      buffer = await imagemin.buffer(buffer, {
        plugins: [
          imageminJpegtran(),
          imageminMozjpeg(),
        ],
      });
      break;
    case 'png':
      ext = '.png';
      buffer = await imagemin.buffer(buffer, {
        plugins: [
          (imageminPngquant.default || imageminPngquant)({
            quality: [0.6, 0.8],
          })],
      });
      break;
    case 'webp':
      ext = '.webp';
      buffer = await imagemin.buffer(buffer, {
        plugins: [
          imageminWebp(),
        ],
      });
      break;
    case 'tiff': ext = '.tiff'; break;
    case 'heif': ext = '.heif'; break;
    default: break;
  }
  return {
    ...input, ext, width, height, data: buffer, ...(probe.sync(buffer)),
  };
};

export = img;
