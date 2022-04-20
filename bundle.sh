set -exu

yarn run clean
yarn run check
yarn run build
yarn run bundle
