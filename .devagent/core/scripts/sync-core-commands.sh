#!/bin/bash
set -e

# Syncs DevAgent core commands to .cursor/commands and .agents/commands
# so Cursor and other tools can discover and run them.
# Run from project root.

CORE_COMMANDS_DIR=".devagent/core/commands"

if [ ! -d "$CORE_COMMANDS_DIR" ]; then
  echo "Error: Core commands directory '$CORE_COMMANDS_DIR' not found. Run from project root."
  exit 1
fi

mkdir -p .cursor/commands
mkdir -p .agents/commands

echo "Syncing DevAgent core commands..."

for CMD_PATH in "$CORE_COMMANDS_DIR"/*.md; do
  [ -f "$CMD_PATH" ] || continue
  CMD_FILENAME=$(basename "$CMD_PATH")

  # Cursor: symlink to core command file
  TARGET_CURSOR=".cursor/commands/$CMD_FILENAME"
  if [ -e "$TARGET_CURSOR" ] && [ ! -L "$TARGET_CURSOR" ]; then
    echo "  Skip (not a symlink): $TARGET_CURSOR"
    continue
  fi
  ln -sf "../../$CORE_COMMANDS_DIR/$CMD_FILENAME" "$TARGET_CURSOR"
  echo "  Linked: $TARGET_CURSOR -> $CORE_COMMANDS_DIR/$CMD_FILENAME"

  # Backward compat: .agents/commands -> .cursor/commands
  TARGET_AGENT=".agents/commands/$CMD_FILENAME"
  if [ -e "$TARGET_AGENT" ] && [ ! -L "$TARGET_AGENT" ]; then
    echo "  Skip (not a symlink): $TARGET_AGENT"
    continue
  fi
  ln -sf "../../.cursor/commands/$CMD_FILENAME" "$TARGET_AGENT"
  echo "  Linked: $TARGET_AGENT -> .cursor/commands/$CMD_FILENAME"
done

echo "Core commands synced successfully."
