#!/bin/bash

# Chrome Web Store API v2 Upload Script
# Usage: ./scripts/upload-chrome-v2.sh

set -euo pipefail

MAX_RETRIES=3
RETRY_DELAY=5

# Check required commands
for cmd in curl jq node; do
  if ! command -v "$cmd" &> /dev/null; then
    echo "Error: Required command '$cmd' not found"
    exit 1
  fi
done

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

VERSION=$(node -p "require('./package.json').version" 2>/dev/null) || {
  echo "Error: Failed to get version from package.json"
  exit 1
}
ZIP_FILE=".output/pita-${VERSION}-chrome.zip"

if [ ! -f "$ZIP_FILE" ]; then
  echo "Error: ZIP file not found: $ZIP_FILE"
  echo "Run 'pnpm build && pnpm wxt zip' first"
  exit 1
fi

echo "=== Step 1: Get Access Token ==="
ACCESS_TOKEN=""
for attempt in $(seq 1 "$MAX_RETRIES"); do
  TOKEN_RESPONSE=$(curl -s -w "\n%{http_code}" "https://oauth2.googleapis.com/token" \
    -d "client_id=$CHROME_CLIENT_ID" \
    -d "client_secret=$CHROME_CLIENT_SECRET" \
    -d "refresh_token=$CHROME_REFRESH_TOKEN" \
    -d "grant_type=refresh_token" 2>&1) || {
    echo "Attempt $attempt/$MAX_RETRIES: curl connection failed"
    if [ "$attempt" -lt "$MAX_RETRIES" ]; then
      echo "Retrying in ${RETRY_DELAY}s..."
      sleep "$RETRY_DELAY"
      continue
    fi
    echo "Error: Failed to connect to OAuth server after $MAX_RETRIES attempts"
    exit 1
  }

  HTTP_CODE=$(echo "$TOKEN_RESPONSE" | tail -n1)
  TOKEN_BODY=$(echo "$TOKEN_RESPONSE" | sed '$d')
  echo "OAuth HTTP Status: $HTTP_CODE"

  if [ "$HTTP_CODE" = "200" ]; then
    ACCESS_TOKEN=$(echo "$TOKEN_BODY" | jq -r '.access_token')
    if [ "$ACCESS_TOKEN" != "null" ] && [ -n "$ACCESS_TOKEN" ]; then
      echo "Access token obtained successfully"
      break
    fi
    echo "Error: Response was 200 but no access_token found"
    exit 1
  fi

  # Extract error info (safe to show)
  ERROR_MSG=$(echo "$TOKEN_BODY" | jq -r '.error // "unknown"' 2>/dev/null || echo "unknown")
  ERROR_DESC=$(echo "$TOKEN_BODY" | jq -r '.error_description // "no description"' 2>/dev/null || echo "no description")
  echo "Attempt $attempt/$MAX_RETRIES: OAuth error: $ERROR_MSG - $ERROR_DESC"

  # Don't retry on auth errors (token expired/revoked)
  if [ "$ERROR_MSG" = "invalid_grant" ] || [ "$ERROR_MSG" = "invalid_client" ]; then
    echo "Error: Authentication failed. Refresh token may be expired or revoked."
    echo "Regenerate the refresh token and update CHROME_REFRESH_TOKEN secret."
    exit 1
  fi

  if [ "$attempt" -lt "$MAX_RETRIES" ]; then
    echo "Retrying in ${RETRY_DELAY}s..."
    sleep "$RETRY_DELAY"
  else
    echo "Error: Failed to get access token after $MAX_RETRIES attempts"
    exit 1
  fi
done

echo ""
echo "=== Step 2: Upload ZIP file (API v2) ==="
echo "Uploading: $ZIP_FILE"

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/zip" \
  -H "x-goog-api-version: 2" \
  -X POST \
  -T "$ZIP_FILE" \
  "https://chromewebstore.googleapis.com/upload/v2/publishers/${CHROME_PUBLISHER_ID}/items/${CHROME_EXTENSION_ID}:upload") || {
  echo "Error: Failed to connect to Chrome Web Store API"
  exit 1
}

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
  "https://chromewebstore.googleapis.com/v2/publishers/${CHROME_PUBLISHER_ID}/items/${CHROME_EXTENSION_ID}:publish") || {
  echo "Error: Failed to connect to Chrome Web Store API"
  exit 1
}

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
