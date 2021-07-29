import fs from 'fs';
import stream from 'stream';
import { promisify } from 'util';
import sharp, { AvailableFormatInfo, FormatEnum } from 'sharp';
import { Handler } from './types.js';
import { debounceAndAggregate } from './util.js';
import { Asset } from './variant.js';
// import imagemin from 'imagemin';
// import imageminJpegtran from 'imagemin-jpegtran';
// import imageminMozjpeg from 'imagemin-mozjpeg';
// import imageminPngquant from 'imagemin-pngquant';
// import imageminWebp from 'imagemin-webp';

interface ImageVariantOptions {
  format?: keyof FormatEnum | AvailableFormatInfo;
  width?: number;
  height: number;
}

type BatchArgs = [
  ImageVariantOptions,
  (result: { type: string, width: number, height: number, data: Buffer }) => void,
];

const pipeline = promisify(stream.pipeline);

const holdUp = new WeakMap<Asset, ReturnType<typeof debounceAndAggregate>>();

// const isFinite = (num: any): num is number => Number.isFinite(num);

// const normalizeDimensions = (original: any = {}, target: any = {}) => {
//   if (isFinite(target.width) && isFinite(target.height)) {
//     if (target.width <= original.width && target.height <= original.height) {
//       return target;
//     }
//     const targetAspect = target.width / target.height;
//     const originalAspect = original.width / original.height;
//     // one of the target dimensions is higher than the original, so we must find
//     // the largest box with targetAspect that will fit in the original:
//     let resolvedWidth = original.width;
//     let resolvedHeight = original.height;
//     if (originalAspect > targetAspect) {
//       resolvedWidth = Math.floor(original.height * targetAspect);
//     }
//     if (originalAspect < targetAspect) {
//       resolvedHeight = Math.floor(original.width / targetAspect);
//     }
//     return {
//       ...target,
//       width: resolvedWidth,
//       height: resolvedHeight,
//     };
//   }
//   let width: number | undefined;
//   let height: number | undefined;
//   const { width: _w, height: _h, ...other } = target;
//   const w = Number(_w);
//   const h = Number(_h);
//   if (isFinite(w)) {
//     width = w;
//   }
//   if (isFinite(h)) {
//     height = h;
//   }
//   return { width, height, ...other };
// };

const batch = (input: Asset) => async (args: BatchArgs[]) => {
  console.debug(`Running batch of ${args.length} for ${input.source}`);
  holdUp.delete(input);
  const sharpStream = sharp({
    failOnError: false,
  });

  for (const [target, resolve] of args) {
    const clone = sharpStream.clone();
    if (target.width || target.height) {
      clone.resize({
        width: target.width,
        height: target.height,
        withoutEnlargement: true,
        fit: sharp.fit.inside,
      });
    }
    switch (target.format) {
      case 'avif':
        clone.toFormat(target.format, { quality: 70 });
        break;
      case 'webp':
        clone.toFormat(target.format, { quality: 85 /* , smartSubsample: true */ });
        break;
      default:
        break;
    }
    clone
      .toBuffer({ resolveWithObject: true })
      .then(({ info: { width, height, format }, data }) => {
        resolve({
          width, height, type: (target.format as string ?? format), data,
        });
      });
  }
  pipeline(
    fs.createReadStream(input.source),
    sharpStream,
  );
  //   // const image = sharp(await input.data);
  //   // const original = sharpStream.clone().metadata();
  //   // console.debug(`original width x height ${width} x ${height} format: ${originalFormat}`);
  //   console.debug(`${input.source}: ${target.width}x${target.height} .${target.format}`);
  //   // TODO test for valid formats
  //   if (target.format) {
  //     switch (target.format) {
  //       case 'avif':
  //         image.toFormat(target.format, { quality: 70 });
  //         break;
  //       case 'webp':
  //         image.toFormat(target.format, { quality: 85 /* , smartSubsample: true */ });
  //         break;
  //       default:
  //         image.toFormat(target.format);
  //         break;
  //     }
  //   }
  // }

  // let { type } = input;
  // // console.debug(`repack.options.dev = ${repack.options.dev}`);
  // if (repack.options.dev) {
  //   // console.debug('skipping optimization');
  //   return { type, data: image.toBuffer() };
  // }
  // const buffer = await image.toBuffer();
  // let data: Promise<Buffer>;
  // switch (target.format || original.format) {
  //   case 'jpeg':
  //   case 'jpg':
  //     type = 'jpg';
  //     data = Promise.resolve(buffer);
  //     // data = imagemin.buffer(buffer, {
  //     //   plugins: [
  //     //     imageminJpegtran(),
  //     //     imageminMozjpeg(),
  //     //   ],
  //     // });
  //     break;
  //   case 'png':
  //     type = 'png';
  //     data = Promise.resolve(buffer);
  //     // data = imagemin.buffer(buffer, {
  //     //   plugins: [
  //     //     (imageminPngquant.default || imageminPngquant)({
  //     //       quality: [0.6, 0.8],
  //     //     })],
  //     // });
  //     break;
  //   case 'webp':
  //     type = 'webp';
  //     data = Promise.resolve(buffer);
  //     // data = imagemin.buffer(buffer, {
  //     //   plugins: [
  //     //     imageminWebp(),
  //     //   ],
  //     // });
  //     break;
  //   case 'avif':
  //     type = 'avif';
  //     data = Promise.resolve(buffer);
  //     break;
  //   default:
  //     data = Promise.resolve(buffer);
  //     break;
  // }
  // return { type, data };
};

const img: Handler = (/* repack */) => async (input, target: ImageVariantOptions) =>
  new Promise((resolve) => {
    if (!holdUp.has(input)) {
      holdUp.set(input, debounceAndAggregate(batch(input)));
    }
    holdUp.get(input)!(target, resolve);
  });

export default img;
