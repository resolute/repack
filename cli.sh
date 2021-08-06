#!/bin/bash
script="$(dirname $(dirname $0) )/@resolute/repack/cli.js"
node --es-module-specifier-resolution=node --loader ts-node/esm "$script" ${@:1}
