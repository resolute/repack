import fs from 'fs';
import path from 'path';
import { optimize, loadConfig } from 'svgo';
import type { Handler } from './types.js';

const svg: Handler = (/* repack */) => async (input) => {
  try {
    const string = (await input.data).toString();

    const config = fs.existsSync(path.join(process.cwd(), 'svg.config.js'))
      ? await loadConfig('svg.config.js', process.cwd()) : {};
    const result = optimize(string, {
      // datauri: 'unenc', // our regex escaping is better than encodeURIComponent()
      plugins: [
        {
          name: 'preset-default',
          params: {
            overrides: {
              cleanupIds: false,
              convertTransform: false,
            },
          },
        },
        'removeTitle',
        'sortAttrs',
        'removeDimensions',
      ],
      ...config,
    });
    if (!(('data' in result))) {
      throw new Error((result as any).error ?? result);
    }
    const { data } = result;
    return Buffer.from(data);
  } catch (error) {
    process.emitWarning(`${input.source}: ${error}`);
    return input.data;
  }
};

export default svg;
