#!/usr/bin/env bash

set -euo pipefail

# Source and destination directories
BASE_LAMBDA_DIR="apps/api/src/lambdas"
DIST_DIR="infrastructure/terraform/lambdas"

# Find all directories in BASE_LAMBDA_DIR
LAMBDAS=$(find "$BASE_LAMBDA_DIR" -mindepth 1 -maxdepth 1 -type d)

# Create DIST_DIR if it doesn't exist
mkdir -p "$DIST_DIR"

echo "📦 Starting build of all Lambda functions..."

for LAMBDA_PATH in $LAMBDAS; do
  # Extract function name from directory
  NAME=$(basename "$LAMBDA_PATH")
  # Source index.ts file
  SRC_FILE="$LAMBDA_PATH/index.ts"
  # Destination .ts and .js files in DIST_DIR
  TS_FILE="$DIST_DIR/$NAME.ts"
  JS_FILE="$DIST_DIR/$NAME.js"
  # Output ZIP file
  ZIPFILE="$DIST_DIR/$NAME.lambda.zip"

  echo "🔧 [$NAME] Copying index.ts to $TS_FILE..."

  # Check if source index.ts exists
  if [ ! -f "$SRC_FILE" ]; then
    echo "❌ [$NAME] Entrypoint $SRC_FILE does not exist"
    continue
  fi

  # Copy index.ts to DIST_DIR with function name
  cp "$SRC_FILE" "$TS_FILE"

  echo "🔧 [$NAME] Building with esbuild in $DIST_DIR..."
  # Run esbuild to bundle TypeScript into JavaScript
  pnpm dlx esbuild "$TS_FILE" \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile="$JS_FILE" \
    --log-level=debug || { echo "❌ [$NAME] esbuild failed"; continue; }

  echo "📦 [$NAME] Creating ZIP archive $ZIPFILE..."
  # Create ZIP archive from JS file
  zip "$ZIPFILE" "$JS_FILE" > /dev/null

  echo "🗑️ [$NAME] Removing temporary files $TS_FILE and $JS_FILE..."
  # Clean up temporary .ts and .js files
  rm -f "$TS_FILE" "$JS_FILE"
done

echo "✅ All Lambda functions built and placed in $DIST_DIR:"
ls -lh "$DIST_DIR"/*.zip