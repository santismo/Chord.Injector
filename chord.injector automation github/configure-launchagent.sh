#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST_TEMPLATE="$ROOT_DIR/com.chord.injector.watch.plist"
PLIST_OUT="$ROOT_DIR/com.chord.injector.watch.local.plist"
LOG_PATH="$ROOT_DIR/watch.log"
SCRIPT_PATH="$ROOT_DIR/process-midi.js"

if [[ ! -f "$PLIST_TEMPLATE" ]]; then
  echo "Missing plist template: $PLIST_TEMPLATE" >&2
  exit 1
fi

sed \
  -e "s|/Users/YOUR_USERNAME/PATH_TO/chord.injector automation/process-midi.js|$SCRIPT_PATH|g" \
  -e "s|/Users/YOUR_USERNAME/PATH_TO/chord.injector automation/watch.log|$LOG_PATH|g" \
  "$PLIST_TEMPLATE" > "$PLIST_OUT"

cat <<EOF2
LaunchAgent configured:
- $PLIST_OUT

Install:
  cp "$PLIST_OUT" ~/Library/LaunchAgents/com.chord.injector.watch.plist
  launchctl load ~/Library/LaunchAgents/com.chord.injector.watch.plist

Stop:
  launchctl unload ~/Library/LaunchAgents/com.chord.injector.watch.plist
EOF2
