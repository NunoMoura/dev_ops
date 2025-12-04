#!/bin/bash
set -e

REPO_URL="git+https://github.com/your-org/dev_ops.git"

echo "🔄 Updating dev_ops framework..."

# 1. Try uv
if command -v uv &> /dev/null; then
    if uv tool list | grep -q "dev_ops"; then
        echo "✅ Found 'dev_ops' installed via uv. Upgrading..."
        uv tool upgrade dev_ops
        exit 0
    fi
fi

# 2. Try pipx
if command -v pipx &> /dev/null; then
    if pipx list | grep -q "dev_ops"; then
        echo "✅ Found 'dev_ops' installed via pipx. Upgrading..."
        pipx upgrade dev_ops
        exit 0
    fi
fi

# 3. Fallback to pip
echo "⚠️  Could not detect managed install (uv/pipx). Attempting pip upgrade..."
if command -v pip3 &> /dev/null; then
    pip3 install --upgrade --user "$REPO_URL"
elif command -v pip &> /dev/null; then
    pip install --upgrade --user "$REPO_URL"
else
    echo "❌ Error: Python pip not found."
    exit 1
fi

echo "🎉 dev_ops updated successfully!"
