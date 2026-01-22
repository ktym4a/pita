#!/bin/bash

# Chrome Web Store API v2 Upload Script
# Usage: ./scripts/upload-chrome-v2.sh

set -e

# Required environment variables:
# - CHROME_CLIENT_ID
# - CHROME_CLIENT_SECRET
# - CHROME_REFRESH_TOKEN
# - CHROME_EXTENSION_ID
# - CHROME_PUBLISHER_ID (get from Developer Dashboard Account page)

# Check required variables
if [ -z "$CHROME_CLIENT_ID" ] || [ -z "$CHROME_CLIENT_SECRET" ] || [ -z "$CHROME_REFRESH_TOKEN" ] || [ -z "$CHROME_EXTENSION_ID" ] || [ -z "$CHROME_PUBLISHER_ID" ]; then
  echo "Error: Missing required environment variables"
  echo "Required: CHROME_CLIENT_ID, CHROME_CLIENT_SECRET, CHROME_REFRESH_TOKEN, CHROME_EXTENSION_ID, CHROME_PUBLISHER_ID"
  exit 1
fi

ZIP_FILE=".output/pita-$(node -p "require('./package.json').version")-chrome.zip"

if [ ! -f "$ZIP_FILE" ]; then
  echo "Error: ZIP file not found: $ZIP_FILE"
  echo "Run 'pnpm build && pnpm wxt zip' first"
  exit 1
fi

echo "=== Step 1: Get Access Token ==="
TOKEN_RESPONSE=$(curl -s "https://oauth2.googleapis.com/token" \
  -d "client_id=$CHROME_CLIENT_ID" \
  -d "client_secret=$CHROME_CLIENT_SECRET" \
  -d "refresh_token=$CHROME_REFRESH_TOKEN" \
  -d "grant_type=refresh_token")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "Error: Failed to get access token"
  # Extract only error message, not the full response (may contain sensitive data)
  echo "$TOKEN_RESPONSE" | jq -r '.error_description // .error // "Unknown error"'
  exit 1
fi

echo "Access token obtained successfully"

echo ""
echo "=== Step 2: Upload ZIP file (API v2) ==="
echo "Uploading: $ZIP_FILE"

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-api-version: 2" \
  -X POST \
  -T "$ZIP_FILE" \
  "https://chromewebstore.googleapis.com/upload/v2/publishers/$CHROME_PUBLISHER_ID/items/$CHROME_EXTENSION_ID:upload")

HTTP_CODE=$(echo "$UPLOAD_RESPONSE" | tail -n1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
  echo "Error: Upload failed"
  # Extract only error info, not full response
  echo "$UPLOAD_BODY" | jq -r '.error.message // .error // "Unknown error"' 2>/dev/null || echo "Failed to parse error"
  exit 1
fi

UPLOAD_STATE=$(echo "$UPLOAD_BODY" | jq -r '.uploadState // "UNKNOWN"')
echo "Upload state: $UPLOAD_STATE"

echo ""
echo "=== Step 3: Submit for Review (API v2) ==="

PUBLISH_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "x-goog-api-version: 2" \
  -X POST \
  "https://chromewebstore.googleapis.com/v2/publishers/$CHROME_PUBLISHER_ID/items/$CHROME_EXTENSION_ID:publish")

HTTP_CODE=$(echo "$PUBLISH_RESPONSE" | tail -n1)
PUBLISH_BODY=$(echo "$PUBLISH_RESPONSE" | sed '$d')

echo "HTTP Status: $HTTP_CODE"

if [ "$HTTP_CODE" != "200" ]; then
  echo "Error: Publish failed"
  # Extract only error info, not full response
  echo "$PUBLISH_BODY" | jq -r '.error.message // .error // "Unknown error"' 2>/dev/null || echo "Failed to parse error"
  exit 1
fi

PUBLISH_STATUS=$(echo "$PUBLISH_BODY" | jq -r '.status[0] // "UNKNOWN"')
echo "Publish status: $PUBLISH_STATUS"

echo ""
echo "=== Done ==="
echo "Extension submitted for review successfully."
