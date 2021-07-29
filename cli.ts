#!/usr/bin/env node
import repack from './index.js';

// // When you want to try using the ts-node/esm loader...
// #!/bin/bash
// script="$(dirname $(dirname $0) )/@resolute/repack/cli.js"
// # node --loader ts-node/esm "$script"
// node "$script"

const dev = process.argv.find((arg) => /\bdev/.test(arg)) !== undefined;
const watch = process.argv.indexOf('watch') !== -1;

repack({ dev })
  .then((instance) => {
    if (watch) {
      instance.watch();
    }
    instance.run();
  });
