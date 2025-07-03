#!/usr/bin/env bash

set -euo pipefail

# Определяем директорию скрипта
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Source directory for Lambda functions (относительно скрипта)
BASE_LAMBDA_DIR="$SCRIPT_DIR/../apps/api/src/lambdas"
# Temporary local destination directory for ZIP files
DIST_DIR="$SCRIPT_DIR/.temp"
# S3 prefix for Lambda ZIPs
S3_PREFIX=""

# Check if LAMBDAS_S3_BUCKET is set
if [ -z "${LAMBDAS_S3_BUCKET:-}" ]; then
  echo "❌ Error: LAMBDAS_S3_BUCKET environment variable is not set"
  exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
  echo "❌ Error: AWS credentials are not configured or invalid"
  exit 1
fi

# Check if BASE_LAMBDA_DIR exists
if [ ! -d "$BASE_LAMBDA_DIR" ]; then
  echo "❌ Error: BASE_LAMBDA_DIR $BASE_LAMBDA_DIR does not exist"
  exit 1
fi

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
  # Destination .js file in the same directory
  JS_FILE="$LAMBDA_PATH/index.js"
  # Temporary ZIP file in the same directory
  TEMP_ZIP="$LAMBDA_PATH/$NAME.lambda.zip"
  # Final ZIP file in DIST_DIR
  ZIPFILE="$DIST_DIR/$NAME.lambda.zip"
  # S3 destination path
  S3_DEST="s3://$LAMBDAS_S3_BUCKET/$S3_PREFIX$NAME.lambda.zip"

  echo "🔧 [$NAME] Checking $SRC_FILE"
  # Check if source index.ts exists
  if [ ! -f "$SRC_FILE" ]; then
    echo "❌ [$NAME] Entrypoint $SRC_FILE does not exist"
    continue
  fi

  echo "🔧 [$NAME] Building with esbuild in $LAMBDA_PATH..."
  # Run esbuild to bundle TypeScript into index.js in the same directory
  pnpm dlx esbuild "$SRC_FILE" \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile="$JS_FILE" \
    --log-level=debug || {
      echo "❌ [$NAME] esbuild failed"
      rm -f "$JS_FILE"  # Clean up partial file
      continue
    }

  # Check if index.js exists after build
  if [ ! -f "$JS_FILE" ]; then
    echo "❌ [$NAME] Compiled file $JS_FILE does not exist after esbuild"
    continue
  fi

  echo "📦 [$NAME] Creating ZIP archive $TEMP_ZIP..."
  # Debug: Check directory contents
  echo "Debug: Contents of $LAMBDA_PATH: $(ls -l $LAMBDA_PATH)"
  # Create ZIP archive with index.js in root
  (cd "$LAMBDA_PATH" && zip -j "$TEMP_ZIP" index.js) || {
    echo "❌ [$NAME] ZIP creation failed. Error details: $?"
    ls -l "$LAMBDA_PATH"  # Additional debug info
    rm -f "$JS_FILE" "$TEMP_ZIP"
    continue
  }

  echo "🔧 [$NAME] Moving $TEMP_ZIP to $ZIPFILE..."
  mv "$TEMP_ZIP" "$ZIPFILE" || {
    echo "❌ [$NAME] Failed to move ZIP file"
    rm -f "$JS_FILE" "$TEMP_ZIP"
    continue
  }

  echo "📤 [$NAME] Uploading $ZIPFILE to $S3_DEST..."
  # Debug: Print the exact S3 destination
  echo "Debug: S3 destination path: $S3_DEST"
  # Upload ZIP to S3
  aws s3 cp "$ZIPFILE" "$S3_DEST" --quiet || {
    echo "❌ [$NAME] S3 upload failed"
    rm -f "$JS_FILE" "$ZIPFILE"
    continue
  }

  echo "🗑️ [$NAME] Removing temporary files..."
  # Clean up temporary files including index.js in the source directory
  rm -f "$JS_FILE"

  echo "______________________________"
  echo ""
done

rm -rf "$DIST_DIR"  # Clean up the temporary directory

echo "✅ All Lambda functions built and uploaded to s3://$LAMBDAS_S3_BUCKET/$S3_PREFIX:"
aws s3 ls "s3://$LAMBDAS_S3_BUCKET/$S3_PREFIX"
echo "🎉 Build process completed successfully!"