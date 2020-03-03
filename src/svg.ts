import fs = require('fs');
import probe = require('probe-image-size');

const Svgo = require('svgo');

const svg = (asset) => async (input) => {
  try {
    let incomingData = input.data;
    if (!incomingData) {
      const { filename } = input;
      incomingData = await fs.promises.readFile(filename, 'utf-8');
    }
    const { data } = await new Svgo({
      // datauri: 'unenc', // our regex escaping is better than encodeURIComponent()
      plugins: [
        { cleanupIDs: false },
        { removeTitle: true },
        { sortAttrs: true },
        { convertTransform: false },
        { removeDimensions: true },
      ],
    })
      .optimize(incomingData, {}); // info param required by svgo@1.3.1
    const { width, height } = probe.sync(Buffer.from(data));
    return {
      ...input, data, width, height,
    };
  } catch (error) {
    process.emitWarning(`${input.filename}: ${error}`);
    return input;
  }
};

export = svg;
