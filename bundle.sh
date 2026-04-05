set -exu

YARN_BIN="yarn"

# check if yarn is installed
if ! command -v yarn &> /dev/null; then
    YARN_BIN="npx yarn"
fi

$YARN_BIN run clean
$YARN_BIN run check
$YARN_BIN run build
$YARN_BIN run bundle
