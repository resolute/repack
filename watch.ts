import sane from 'sane';
import { Stats } from 'fs';
import marko from './marko.js';
import { debounceAndAggregate } from './util.js';
import type { Repack, WatchOptions } from './types.js';

// const unique = (val, index, arr) => arr.indexOf(val) === index;
// const flatten = (acc, val) => acc.concat(val);

let watcher: sane.Watcher;

const watch = (repack: Repack, options: Partial<WatchOptions> = {}) => {
  // TODO dynamic config
  if (watcher) {
    return;
    // return watcher;
  }

  const run = debounceAndAggregate(async (args: ([string, string, Stats?])[]) => {
    const invalidatedFiles: string[] = [];
    // eslint-disable-next-line no-restricted-syntax
    for (const [relative] of args) {
      // for (const [relative, cwd] of args) {
      if (/\.marko/.test(relative)) {
        // marko.delete(path.join(cwd, relative));
        marko.delete();
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

export default watch;
