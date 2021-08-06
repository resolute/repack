import fs from 'fs';
import path from 'path';
import { optimize, loadConfig } from 'svgo';
import type { Handler } from './types.js';

const svg: Handler = (/* repack */) => async (input) => {
  try {
    const string = (await input.data).toString();

    const config = fs.existsSync(path.join(process.cwd(), 'svg.config.js'))
      ? await loadConfig('svg.config.js', process.cwd()) : {};
    const { data } = optimize(string, {
      // datauri: 'unenc', // our regex escaping is better than encodeURIComponent()
      plugins: [
        'removeTitle',
        'sortAttrs',
        'removeDimensions',
        { name: 'cleanupIDs', active: false },
        { name: 'convertTransform', active: false },
      ],
      ...config,
    });
    return Buffer.from(data);
  } catch (error) {
    process.emitWarning(`${input.source}: ${error}`);
    return input.data;
  }
};

export default svg;
