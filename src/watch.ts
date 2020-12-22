import path = require('path');
import sane = require('sane');

// eslint-disable-next-line import/first
import { Repack, WatchOptions } from './types';

import marko = require('./marko.js');

// const unique = (val, index, arr) => arr.indexOf(val) === index;
// const flatten = (acc, val) => acc.concat(val);

let watcher: sane.Watcher;

/**
 * debounce: Returns a function, that, as long as it continues to be
 * invoked (.), will not be triggered (*).  The function will be called
 * after it stops being called for `threshold` milliseconds.  If
 * `immediate` is passed, trigger the function on the leading edge,
 * instead of the trailing.
 *
 *       /-- 10s --\ /-- 10s --\ /-- 10s --\
 *     (*). . . . . . . . . . . .           *
 *
 * @param   function    fn          Function to be throttled
 * @param   number      threshold   Milliseconds fn will be throttled
 *
 * @return  function    Debounce'd function `fn`
 */

const debounceAndAggregate = (fn: Function, threshold?: number) => {
  let timeout;
  let aggregateArgs: any[] = [];

  return (...args: any) => {
    aggregateArgs.push(args);

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      timeout = null;
      fn.call(undefined, aggregateArgs);
      aggregateArgs = [];
    }, threshold);
  };
};

const watch = (repack: Repack, options: Partial<WatchOptions> = {}) => {
  // TODO dynamic config
  if (watcher) {
    return;
    // return watcher;
  }

  const run = debounceAndAggregate(async (paths) => {
    const invalidatedFiles: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [relative, cwd] of paths) {
      if (/\.marko/.test(relative)) {
        marko.delete(path.join(cwd, relative));
      } else if (/\.(?:svg|s?css)$/.test(relative)) {
        Object.keys(repack.all()).filter((filename) => /\.s?css$/.test(filename)).forEach((filename) => {
          invalidatedFiles.push(filename);
        });
      } else if (/\.[jt]s$/.test(relative)) {
        Object.keys(repack.all()).filter((filename) => /\.[jt]s$/.test(filename)).forEach((filename) => {
          invalidatedFiles.push(filename);
        });
      }
      invalidatedFiles.push(relative);
    }
    await Promise.all(invalidatedFiles.map((file) => repack.delete(file)));
    return repack.run();
  }, 16);

  watcher = sane(process.cwd(), { ignored: [...(options?.ignore || [])] })
    .on('change', run)
    .on('add', run)
    .on('delete', run);

  // return watcher;
};

export = watch;
