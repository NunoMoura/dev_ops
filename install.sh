#!/bin/bash
# dev_ops Framework Installer
# Usage: curl -sL https://raw.githubusercontent.com/NunoMoura/dev_ops/main/install.sh | bash

set -e

REPO_URL="https://github.com/NunoMoura/dev_ops.git"
TARGET_DIR="dev_ops"

echo "🚀 Installing dev_ops framework..."

# Check if target directory exists
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️  Directory '$TARGET_DIR' already exists."
    read -p "Overwrite? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "❌ Installation cancelled."
        exit 1
    fi
    rm -rf "$TARGET_DIR"
fi

# Clone (shallow, no history)
echo "📦 Cloning repository..."
git clone --depth 1 --quiet "$REPO_URL" "$TARGET_DIR"

# Clean up non-vendored files
echo "🧹 Cleaning up..."
rm -rf "$TARGET_DIR/.git"
rm -rf "$TARGET_DIR/tests"
rm -rf "$TARGET_DIR/.github"
rm -f "$TARGET_DIR/install.sh"
rm -f "$TARGET_DIR/LICENSE"
rm -f "$TARGET_DIR/README.md"

# Run bootstrap
echo "⚙️  Running bootstrap..."
python3 "$TARGET_DIR/scripts/bootstrap.py"

echo ""
echo "✅ dev_ops installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Open your project in Antigravity IDE"
echo "  2. Use /bootstrap to configure agent rules"
echo "  3. Start using workflows: /bug, /adr, /plan, etc."
echo ""
