#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOWNLOADS_DIR="$HOME/Downloads"
DEST_DIR="$DOWNLOADS_DIR/Chord.Injector Automation"

if [[ -z "${CHORD_INJECTOR_MOVED:-}" && -d "$DOWNLOADS_DIR" && "$ROOT_DIR" != "$DEST_DIR" ]]; then
  mkdir -p "$DEST_DIR"
  if command -v rsync >/dev/null 2>&1; then
    rsync -a "$ROOT_DIR/" "$DEST_DIR/"
  else
    cp -R "$ROOT_DIR/." "$DEST_DIR/"
  fi
  export CHORD_INJECTOR_MOVED=1
  exec bash "$DEST_DIR/install.sh"
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node and re-run." >&2
  exit 1
fi

mkdir -p "$ROOT_DIR/Inbox" "$ROOT_DIR/Outbox" "$ROOT_DIR/Archive"

chmod +x "$ROOT_DIR/process-midi.js" "$ROOT_DIR/configure-launchagent.sh" || true

"$ROOT_DIR/configure-launchagent.sh" >/dev/null 2>&1 || true

open "$ROOT_DIR" >/dev/null 2>&1 || true

cat <<EOF2
Setup complete.

Start the listener:
  node ./process-midi.js

Optional (run at login):
  cp ./com.chord.injector.watch.local.plist ~/Library/LaunchAgents/com.chord.injector.watch.plist
  launchctl load ~/Library/LaunchAgents/com.chord.injector.watch.plist
EOF2
