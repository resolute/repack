#!/usr/bin/env node
import repack from './index.js';

const dev = process.argv.find((arg) => /\bdev/.test(arg)) !== undefined;
const watch = process.argv.indexOf('watch') !== -1;

repack({ dev })
  .then((instance) => {
    if (watch) {
      instance.watch();
    }
    instance.run();
  });
