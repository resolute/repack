import fs = require('fs');
import probe = require('probe-image-size');
import sharp = require('sharp');
import imagemin = require('imagemin');
import imageminJpegtran = require('imagemin-jpegtran');
import imageminMozjpeg = require('imagemin-mozjpeg');
import imageminPngquant = require('imagemin-pngquant');
import imageminWebp = require('imagemin-webp');

type VariantOptions = { format?: string } & sharp.ResizeOptions & (sharp.OutputOptions
  | sharp.JpegOptions | sharp.PngOptions
  | sharp.WebpOptions | sharp.TiffOptions);

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

const separateOptions = (options: VariantOptions = {}) => {
  const {
    format,
    width,
    height,
    fit,
    position,
    background,
    kernel,
    withoutEnlargement,
    fastShrinkOnLoad,
    ...outputOptions
  } = options;
  const resizeOptions = {
    width,
    height,
    fit,
    position,
    background,
    kernel,
    withoutEnlargement,
    fastShrinkOnLoad,
  };
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, value] of Object.entries(resizeOptions)) {
    if (typeof value === 'undefined') {
      delete resizeOptions[key];
    }
  }
  return {
    format,
    resizeOptions: { ...{ withoutEnlargement: false }, ...resizeOptions },
    outputOptions,
  };
};

// TODO: allow for resizeOptions and outputOptions
const img = (asset) => async (input, variant: VariantOptions) => {
  const { filename, data } = input;
  let { ext } = input;
  const { format: targetFormat, resizeOptions, outputOptions } = separateOptions(variant);
  const original = sharp(data || await fs.promises.readFile(filename));
  const { width, height, format: originalFormat } = await original.metadata();
  // console.debug(`original width x height ${width} x ${height} format: ${originalFormat}`);
  let image = original;
  let buffer: Buffer;
  // const resizeOptions = normalizeResizeOptions({ ...{ width: options.width } });
  if (resizeOptions.width || resizeOptions.height) {
    image = image.resize(resizeOptions);
  }
  // TODO test for valid formats
  // if (targetFormat) {
  image = image.toFormat(targetFormat || originalFormat!, outputOptions);
  // }
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
