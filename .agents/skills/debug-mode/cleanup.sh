#!/bin/bash

# Debug Log Cleanup Script
# Removes all #region debug-log blocks from the codebase

echo "🔍 Searching for debug log regions..."

# Find all files with debug-log regions
FILES=$(grep -rl "#region debug-log" --include="*.ts" --include="*.tsx" . 2>/dev/null)

if [ -z "$FILES" ]; then
  echo "✅ No debug logs found. Codebase is clean."
  exit 0
fi

echo "📋 Found debug logs in:"
echo "$FILES" | while read file; do
  count=$(grep -c "#region debug-log" "$file")
  echo "   $file ($count regions)"
done

echo ""
read -p "🗑️  Remove all debug logs? (y/n): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
  echo "$FILES" | while read file; do
    # Use sed to remove #region debug-log ... #endregion blocks
    # This handles multi-line blocks
    sed -i '' '/#region debug-log/,/#endregion/d' "$file"
    echo "   ✓ Cleaned $file"
  done

  echo ""
  echo "✅ All debug logs removed."

  # Also remove debug.log file if it exists
  if [ -f "debug.log" ]; then
    rm debug.log
    echo "✅ Removed debug.log file."
  fi
else
  echo "❌ Cleanup cancelled."
fi
