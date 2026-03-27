#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NIRI_CONFIG="${NIRI_CONFIG:-$HOME/.config/niri/config.kdl}"

usage() {
    echo "Usage: $0 <theme>"
    echo ""
    echo "Available themes:"
    for dir in "$SCRIPT_DIR"/*/; do
        [ -f "$dir/open.frag" ] || [ -f "$dir/close.frag" ] || continue
        basename "$dir"
    done
    exit 1
}

[ $# -lt 1 ] && usage

THEME="$1"
THEME_DIR="$SCRIPT_DIR/$THEME"

if [ ! -d "$THEME_DIR" ]; then
    echo "Error: theme '$THEME' not found"
    usage
fi

if [ ! -f "$NIRI_CONFIG" ]; then
    echo "Error: niri config not found at $NIRI_CONFIG"
    echo "Set NIRI_CONFIG to point to your config.kdl"
    exit 1
fi

# Backup
BACKUP="${NIRI_CONFIG}.bak.$(date +%s)"
cp "$NIRI_CONFIG" "$BACKUP"
echo "Backed up config to $BACKUP"

build_block() {
    local anim_type="$1" frag_file="$2" duration="${3:-800}" curve="${4:-linear}"
    local shader
    shader=$(<"$frag_file")
    cat <<BLOCK
    $anim_type {
        duration-ms $duration
        curve "$curve"
        custom-shader r"
$shader
        "
    }
BLOCK
}

# Load theme config (duration/curve per animation type)
open_duration=800; open_curve=linear
close_duration=800; close_curve=linear
resize_duration=800; resize_curve=linear
if [ -f "$THEME_DIR/theme.conf" ]; then
    source "$THEME_DIR/theme.conf"
fi

# Build the new animations block
ANIMATIONS="animations {\n"

if [ -f "$THEME_DIR/open.frag" ]; then
    ANIMATIONS+="$(build_block "window-open" "$THEME_DIR/open.frag" "$open_duration" "$open_curve")\n"
fi

if [ -f "$THEME_DIR/close.frag" ]; then
    ANIMATIONS+="$(build_block "window-close" "$THEME_DIR/close.frag" "$close_duration" "$close_curve")\n"
fi

if [ -f "$THEME_DIR/resize.frag" ]; then
    ANIMATIONS+="$(build_block "window-resize" "$THEME_DIR/resize.frag" "$resize_duration" "$resize_curve")\n"
fi

ANIMATIONS+="}"

# Expand \n into real newlines for the replacement block
NEW_BLOCK="$(echo -e "$ANIMATIONS")"
export NEW_BLOCK

# Check if there's an existing animations block and replace it, or append
if grep -qP '^\s*animations\s*\{' "$NIRI_CONFIG"; then
    # Use awk to replace the animations block (properly tracks nested braces)
    awk '
    /^\s*animations\s*\{/ {
        depth = 0
        skip = 1
        line = $0
        # Count braces on every line while skipping
        while (skip) {
            n = split(line, chars, "")
            for (i = 1; i <= n; i++) {
                if (chars[i] == "{") depth++
                else if (chars[i] == "}") depth--
            }
            if (depth <= 0) skip = 0
            else if (getline line <= 0) skip = 0
        }
        # Print the replacement block in place of what we skipped
        print ENVIRON["NEW_BLOCK"]
        next
    }
    { print }
    ' "$NIRI_CONFIG" > "${NIRI_CONFIG}.tmp" && mv "${NIRI_CONFIG}.tmp" "$NIRI_CONFIG"
    echo "Replaced existing animations block with '$THEME' theme"
else
    echo -e "\n$ANIMATIONS" >> "$NIRI_CONFIG"
    echo "Appended '$THEME' animations block to config"
fi

# Validate if niri is available
if command -v niri &>/dev/null; then
    if niri validate 2>/dev/null; then
        echo "Config validated successfully!"
    else
        echo "Warning: config validation failed — restoring backup"
        cp "$BACKUP" "$NIRI_CONFIG"
        exit 1
    fi
fi

echo "Done! Theme '$THEME' installed."
