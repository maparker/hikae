#!/usr/bin/env bash
# Hikae — GitHub API test script
# Exercises the same read-modify-write flow as the iOS Shortcut.
# Run this to verify your token and repo are configured correctly before
# building the Shortcut on-device.
#
# Usage:
#   export HIKAE_TOKEN=ghp_...
#   export HIKAE_REPO=yourusername/your-repo-name
#   ./test-api.sh "https://example.com/article" "Page Title" "optional note" "optional why"

set -euo pipefail

HIKAE_TOKEN="${HIKAE_TOKEN:?Set HIKAE_TOKEN to your GitHub PAT}"
HIKAE_REPO="${HIKAE_REPO:-maparker/hikae-data}"
API_BASE="https://api.github.com/repos/${HIKAE_REPO}/contents/data/bookmarks.json"

URL="${1:?Usage: $0 <url> [title] [note] [why]}"
TITLE="${2:-Untitled}"
NOTE="${3:-}"
WHY="${4:-}"

CAPTURED_AT=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BOOKMARK_ID="ios-$(python3 -c 'import time; print(int(time.time() * 1000))')"

echo "==> Fetching current bookmarks.json..."
RESPONSE=$(curl -sf \
  -H "Authorization: token ${HIKAE_TOKEN}" \
  -H "Accept: application/vnd.github.v3+json" \
  "${API_BASE}")

FILE_SHA=$(echo "${RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
CONTENT_B64=$(echo "${RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['content'])")

echo "==> Decoding content (sha: ${FILE_SHA})..."
CURRENT_JSON=$(echo "${CONTENT_B64}" | base64 --decode)

echo "==> Resolving source from URL host..."
UPDATED_JSON=$(python3 << PYEOF
import json, uuid
from urllib.parse import urlparse

data = json.loads("""${CURRENT_JSON}""")

url = """${URL}"""
title = """${TITLE}"""
note = """${NOTE}""" or None
why = """${WHY}""" or None

# Extract host (e.g. "news.ycombinator.com")
host = urlparse(url).hostname or url

# Find existing source by host, or create one
source_id = None
for source in data.get("sources", []):
    if host in source.get("url", ""):
        source_id = source["id"]
        break

if source_id is None:
    source_id = "src-${BOOKMARK_ID}"
    data.setdefault("sources", []).append({
        "id": source_id,
        "name": host,
        "url": f"https://{host}",
        "created": "${CAPTURED_AT}",
    })

new_bookmark = {
    "id": "${BOOKMARK_ID}",
    "url": url,
    "title": title,
    "folder_id": None,
    "tag_ids": [],
    "source_id": source_id,
    "note": note,
    "why": why,
    "status": "inbox",
    "captured_at": "${CAPTURED_AT}",
    "captured_by": "ios",
    "last_modified_at": "${CAPTURED_AT}",
    "last_modified_by": "ios",
    "filed_at": None,
    "read_at": None,
    "archived_at": None,
    "deleted_at": None,
}

data.setdefault("bookmarks", []).append(new_bookmark)
data["meta"]["last_modified"] = "${CAPTURED_AT}"
data["meta"]["last_modified_by"] = "ios"

print(json.dumps(data, indent=2))
PYEOF
)

echo "==> Encoding and writing back to GitHub..."
ENCODED=$(echo "${UPDATED_JSON}" | base64 | tr -d '\n')

PUT_BODY=$(python3 -c "
import json
print(json.dumps({
    'message': 'Add bookmark: ${TITLE} via ios',
    'content': '${ENCODED}',
    'sha': '${FILE_SHA}'
}))
")

RESULT=$(curl -sf -X PUT \
  -H "Authorization: token ${HIKAE_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/vnd.github.v3+json" \
  -d "${PUT_BODY}" \
  "${API_BASE}")

COMMIT_URL=$(echo "${RESULT}" | python3 -c "import sys,json; print(json.load(sys.stdin)['commit']['html_url'])")
HOST=$(python3 -c "from urllib.parse import urlparse; print(urlparse('${URL}').hostname)")
echo ""
echo "==> Saved to inbox."
echo "    Commit: ${COMMIT_URL}"
echo "    ID:     ${BOOKMARK_ID}"
echo "    Source: ${HOST}"
