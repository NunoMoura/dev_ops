#!/bin/bash
# dev_ops Framework Installer
# Usage: curl -sL https://raw.githubusercontent.com/NunoMoura/dev_ops/main/install.sh | bash

set -e

REPO_URL="https://github.com/NunoMoura/dev_ops.git"
INSTALL_DIR="$HOME/.dev_ops"
CURRENT_DIR=$(pwd)

echo "🚀 Installing/Updating dev_ops framework..."

# 1. Update Global Tool
if [ -d "$INSTALL_DIR" ]; then
    echo "📦 Updating global dev_ops in $INSTALL_DIR..."
    cd "$INSTALL_DIR"
    git pull --quiet
else
    echo "📦 Cloning dev_ops to $INSTALL_DIR..."
    git clone --depth 1 --quiet "$REPO_URL" "$INSTALL_DIR"
fi

# 2. Run Bootstrap in Target Project
echo "⚙️  Running bootstrap for project at $CURRENT_DIR..."

cd "$CURRENT_DIR"

# Ensure Python script can read from TTY if piped
if [ -t 0 ]; then
    python3 "$INSTALL_DIR/scripts/bootstrap.py" --target "$CURRENT_DIR"
else
    if [ -e /dev/tty ]; then
         python3 "$INSTALL_DIR/scripts/bootstrap.py" --target "$CURRENT_DIR" < /dev/tty
    else
         python3 "$INSTALL_DIR/scripts/bootstrap.py" --target "$CURRENT_DIR"
    fi
fi

echo ""
echo "✅ dev_ops configured for this project!"
echo ""
echo "Next steps:"
echo "  1. Open your project in Antigravity IDE"
echo "  2. Use agents commands like /bug, /plan..."
echo ""
