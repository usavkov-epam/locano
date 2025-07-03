#!/usr/bin/env bash

set -euo pipefail

# Source directory for Lambda functions
BASE_LAMBDA_DIR="apps/api/src/lambdas"
# Temporary local destination directory for ZIP files
DIST_DIR="./scripts/.temp"
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
  # Destination .js file in DIST_DIR (named as index.js)
  JS_FILE="$DIST_DIR/$NAME/index.js"
  # Output ZIP file
  ZIPFILE="$NAME.lambda.zip"
  # S3 destination path
  S3_DEST="s3://$LAMBDAS_S3_BUCKET/$S3_PREFIX$NAME.lambda.zip"

  echo "🔧 [$NAME] Copying index.ts to temporary file for esbuild..."
  # Check if source index.ts exists
  if [ ! -f "$SRC_FILE" ]; then
    echo "❌ [$NAME] Entrypoint $SRC_FILE does not exist"
    continue
  fi

  # Create a directory for the Lambda function in DIST_DIR
  mkdir -p "$DIST_DIR/$NAME"

  # Copy index.ts to DIST_DIR for esbuild processing
  cp "$SRC_FILE" "$DIST_DIR/$NAME/index.ts" || {
    echo "❌ [$NAME] Failed to copy $SRC_FILE to $DIST_DIR/index.ts"
    continue
    }

  echo "🔧 [$NAME] Building with esbuild..."
  # Run esbuild to bundle TypeScript into index.js
  pnpm dlx esbuild "$DIST_DIR/$NAME/index.ts" \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile="$JS_FILE" \
    --log-level=debug

  # Check if index.js exists before zipping
  if [ ! -f "$JS_FILE" ]; then
    echo "❌ [$NAME] Compiled file $JS_FILE does not exist after esbuild"
    rm -rf "$DIST_DIR/$NAME"
    continue
  fi

  echo "📦 [$NAME] Creating ZIP archive $ZIPFILE..."
  # Debug: Check directory contents
  echo "Debug: Contents of $DIST_DIR: $(ls -l $DIST_DIR)"

  cd "$DIST_DIR/$NAME"
  ls -l

  # Create ZIP archive with index.js in root
  (zip -j "$ZIPFILE" index.js) || {
    echo "❌ [$NAME] ZIP creation failed. Error details: $?"
    # rm -f "$JS_FILE"
    exit 1
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

  echo "🗑️ [$NAME] Removing temporary files $JS_FILE, and $ZIPFILE..."
  # Clean up temporary files
  rm -f "$JS_FILE" "$ZIPFILE"
done

echo "✅ All Lambda functions built and uploaded to s3://$LAMBDAS_S3_BUCKET/$S3_PREFIX:"
aws s3 ls "s3://$LAMBDAS_S3_BUCKET/$S3_PREFIX"
echo "🎉 Build process completed successfully!"
