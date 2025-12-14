#!/bin/bash
# dev_ops Framework Installer
# Usage: curl -sL https://raw.githubusercontent.com/NunoMoura/dev_ops/main/install.sh | bash

set -e

REPO_URL="https://github.com/NunoMoura/dev_ops.git"
INSTALL_DIR="$HOME/.dev_ops_core"
BIN_DIR="$HOME/.local/bin"
GLOBAL_CMD="dev_ops"

echo "🚀 Installing/Updating dev_ops framework core..."

# 1. Update/Clone Core Repo
if [ -d "$INSTALL_DIR" ]; then
    echo "📦 Updating global dev_ops in $INSTALL_DIR..."
    cd "$INSTALL_DIR"
    git pull --quiet
else
    echo "📦 Cloning dev_ops to $INSTALL_DIR..."
    git clone --depth 1 --quiet "$REPO_URL" "$INSTALL_DIR"
fi

# 2. Setup Global Command
echo "⚙️  Setting up global command '$GLOBAL_CMD'..."
mkdir -p "$BIN_DIR"

# Link the wrapper script
if [ -L "$BIN_DIR/$GLOBAL_CMD" ] || [ -e "$BIN_DIR/$GLOBAL_CMD" ]; then
    rm -f "$BIN_DIR/$GLOBAL_CMD"
fi

ln -s "$INSTALL_DIR/bin/dev_ops" "$BIN_DIR/$GLOBAL_CMD"

echo ""
echo "✅ dev_ops core installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Ensure '$BIN_DIR' is in your PATH."
echo "     (Add 'export PATH=\"$BIN_DIR:\$PATH\"' to your .bashrc or .zshrc if needed)"
echo "  2. Go to any project directory and run:"
echo "     dev_ops"
echo ""
