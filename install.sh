#!/bin/bash
set -e

REPO_URL="git+https://github.com/NunoMoura/dev_ops.git"

echo "🚀 Installing dev_ops framework..."

# 1. Try uv (Fastest, Recommended)
if command -v uv &> /dev/null; then
    echo "✅ Found 'uv'. Installing via uv tool..."
    uv tool install "$REPO_URL" --force
    echo "🎉 Installed via uv! Try running: dev_ops_server"
    exit 0
fi

# 2. Try pipx (Standard for tools)
if command -v pipx &> /dev/null; then
    echo "✅ Found 'pipx'. Installing via pipx..."
    pipx install "$REPO_URL" --force
    echo "🎉 Installed via pipx! Try running: dev_ops_server"
    exit 0
fi

# 3. Fallback to pip (User install)
echo "⚠️  'uv' or 'pipx' not found. Falling back to pip (user install)..."
if command -v pip3 &> /dev/null; then
    pip3 install --user "$REPO_URL"
    echo "🎉 Installed via pip! Ensure ~/.local/bin is in your PATH."
elif command -v pip &> /dev/null; then
    pip install --user "$REPO_URL"
    echo "🎉 Installed via pip! Ensure ~/.local/bin is in your PATH."
else
    echo "❌ Error: Python pip not found. Please install Python 3."
    exit 1
fi
