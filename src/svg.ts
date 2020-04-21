import Svgo from 'svgo';
import { Handler } from './types';


const svg: Handler = (repack) => async (input) => {
  try {
    // let incomingData = input.data;
    // if (!incomingData) {
    //   const { filename } = input;
    //   incomingData = await fs.promises.readFile(filename, 'utf-8');
    // }
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

export default svg;
