# Extension Installation Guide

## Development Workflow

### Quick Build (Most Common)

```bash
# From extension directory
npm run dist
```

This builds TypeScript and creates a fresh `.vsix` file in one command.

### Manual Steps (if needed)

```bash
npm run package                              # Build TypeScript only
npx @vscode/vsce package --no-dependencies   # Create .vsix only
```

---

## Installation

### Antigravity (WSL Remote)

```bash
# Remove old version
rm -rf ~/.antigravity-server/extensions/nunomoura.dev-ops-*

# Extract and install
unzip -q dev-ops-0.0.1.vsix -d /tmp/devops-install
cp -r /tmp/devops-install/extension ~/.antigravity-server/extensions/nunomoura.dev-ops-0.0.1
rm -rf /tmp/devops-install

# Restart Antigravity completely (close all windows, reopen)
```

### Standard VS Code

Use "Install from VSIX" in Extensions panel (`Ctrl+Shift+X` → `...` menu), or:

```bash
code --install-extension dev-ops-0.0.1.vsix --force
```

---

## Troubleshooting

### Changes Not Appearing

1. Ensure you ran `npm run dist` (creates fresh .vsix)
2. Check the vsix timestamp: `ls -la dev-ops-0.0.1.vsix`
3. **Completely close and reopen** the IDE (Reload Window is NOT enough for webviews)

### Verify Installation

```bash
# Check extension exists
ls ~/.antigravity-server/extensions/nunomoura.dev-ops-*/dist/extension.js

# Verify new code is present (should return 4+)
grep -c "btn-ghost" ~/.antigravity-server/extensions/nunomoura.dev-ops-*/dist/extension.js
```

### Quick Reinstall (One-Liner)

```bash
npm run dist && rm -rf ~/.antigravity-server/extensions/nunomoura.dev-ops-* && unzip -q dev-ops-0.0.1.vsix -d /tmp/dx && cp -r /tmp/dx/extension ~/.antigravity-server/extensions/nunomoura.dev-ops-0.0.1 && rm -rf /tmp/dx && echo "✓ Installed. Restart Antigravity."
```
