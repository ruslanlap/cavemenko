#!/bin/bash
# cavemenko — statusline badge script for Claude Code
# Reads the cavemenko mode flag file and outputs a colored badge.
# Optionally shows token savings counter.
#
# Usage in ~/.claude/settings.json:
#   "statusLine": { "type": "command", "command": "bash /path/to/cavemenko-statusline.sh" }

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
FLAG="$CLAUDE_DIR/.cavemenko-active"
STATS_FILE="$CLAUDE_DIR/.cavemenko-stats"

# Refuse symlinks
[ -L "$FLAG" ] && exit 0
[ ! -f "$FLAG" ] && exit 0

# Hard-cap read at 64 bytes, strip non-alpha
MODE=$(head -c 64 "$FLAG" 2>/dev/null | tr -d '\n\r' | tr '[:upper:]' '[:lower:]')
MODE=$(printf '%s' "$MODE" | tr -cd 'a-z0-9-')

# Whitelist validate
case "$MODE" in
  off|lite|full|ultra|commit|review|compress|translate) ;;
  *) exit 0 ;;
esac

# Read token savings counter if available
SAVED=""
if [ -f "$STATS_FILE" ] && [ ! -L "$STATS_FILE" ]; then
  RAW_SAVED=$(head -c 32 "$STATS_FILE" 2>/dev/null | tr -cd '0-9')
  if [ -n "$RAW_SAVED" ] && [ "$RAW_SAVED" -gt 0 ] 2>/dev/null; then
    if [ "$RAW_SAVED" -ge 1000 ]; then
      K=$((RAW_SAVED / 1000))
      SAVED=" ↓${K}k"
    else
      SAVED=" ↓${RAW_SAVED}"
    fi
  fi
fi

if [ -z "$MODE" ] || [ "$MODE" = "full" ]; then
  printf '\033[38;5;172m[CAVEMENKO%s]\033[0m' "$SAVED"
else
  SUFFIX=$(printf '%s' "$MODE" | tr '[:lower:]' '[:upper:]')
  printf '\033[38;5;172m[CAVEMENKO:%s%s]\033[0m' "$SUFFIX" "$SAVED"
fi
