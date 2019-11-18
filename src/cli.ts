import repack = require('./index');

(async () => {
  const instance = await repack();
  if (process.argv.indexOf('watch') !== -1) {
    instance.watch();
  }
  instance.run();
})();
