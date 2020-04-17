import sane = require('sane');

export interface Watcher extends sane.Watcher { }

export interface VersionParams {
  filename: string;
  ext: string;
  data?: Buffer | string;
  hash?: string;
  destUri: string;
  destDir: string;
  width?: number;
  height?: number;
}

export interface Payload {
  data: VersionParams['data'],
  ext?: VersionParams['ext'],
  width?: VersionParams['width'],
  height?: VersionParams['height'],
}
