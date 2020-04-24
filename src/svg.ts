import { Handler } from './types';

import Svgo = require('svgo');

const svg: Handler = (repack) => async (input) => {
  try {
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
      .optimize((await input.data).toString(), {}); // info param required by svgo@1.3.1
    return Buffer.from(data);
  } catch (error) {
    process.emitWarning(`${input.source}: ${error}`);
    return input.data;
  }
};

export = svg;
