# repack

## Revamp TODO
* [ ] ESM package
* [ ] Hot module reload for config.ts and build.ts
* [ ] ~~Marko@5~~
* [ ] SVGO@latest
* [ ] Throttle processing globally to a configurable number of “lanes”
* [ ] Stream all inputs FS + Got
  * [ ] Got etag caching
  * [ ] Hash the input stream
  * [ ] Write to temporary file and rename to hash
* [ ] Handle video probing
* [ ] Use project dir config for
  * [ ] rollup?
  * [ ] .babelrc.json
  * [ ] terser?
  * [ ] tsconfig?
  * [ ] marko?
  * [ ] svgo.config.js

# INPUTS
* Source
  * File Path
    * Hash: calculate MD5
  * URL
    * Hash: etag Header in HEAD request
* Options
  * Normalize > sort > JSON.stringify > hash

# STATES
Given a Source + Options, which requires either reading the file from disk (local MD5) or evaluating the `etag` from the HEAD request of an external URL, the cached variant either exists in a local cache or does not exist.

If it exists, return the cached variant.

If it does not, POST rio the Source + Options to generate the variant and write the cache?
TODO: lock file? Maybe the Map() can return a promise to act as a lock file?
