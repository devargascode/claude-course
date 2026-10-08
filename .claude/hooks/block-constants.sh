#!/usr/bin/env bash
# PreToolUse hook: blocks any attempt to read constants.js (sensitive data).
# Covers Read (file_path), Grep (path/glob) and Bash (command).

input=$(cat)

tool_input=$(printf '%s' "$input" | jq -r '.tool_input | [.file_path, .path, .glob, .command] | map(select(. != null)) | join(" ")')

if printf '%s' "$tool_input" | grep -Eq '(^|[^[:alnum:]_.-])(\./|/|[^[:space:]]*/)?constants\.js([^[:alnum:]_.-]|$)'; then
  echo "No puedo leer ese archivo" >&2
  exit 2
fi

exit 0
