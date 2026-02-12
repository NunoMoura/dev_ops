---
description: Add an MCP server to a skill phase
category: guided
---

# Add MCP

Add an MCP (Model Context Protocol) server to enhance a phase.

---

## Inputs

- `mcp_name`: Name of the MCP to add (e.g., `context7`)

---

## Step 1: Research MCP

Search for the MCP:

- Look up documentation (npm, GitHub, MCP registries)
- Understand capabilities
- Note authentication requirements

---

## Step 2: Determine Phase

Select phase based on MCP capabilities:

| MCP Purpose | Phase |
|-------------|-------|
| Documentation, Research | `understand` |
| Planning, PM | `plan` |
| Code gen, DBs | `implement` |
| PRs, Testing | `verify` |

---

## Step 3: Configure IDE

Add MCP to config file:

- Antigravity: `~/.gemini/antigravity/mcp_config.json`
- Cursor: `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "{mcp_name}": {
      "command": "npx",
      "args": ["-y", "@package/mcp-server"]
    }
  }
}
```

---

## Step 4: Verify & Document

1. Verify MCP starts without errors
2. Create capability file: `.agent/skills/{skill}/mcps/{mcp_name}.md`

---

## Error Handling

| Error | Action |
|-------|--------|
| Not Found | Ask for package name |
| Auth Required | Guide user through token setup |

---

## Outputs

- MCP configuration in IDE config
- Capability file in `.agent/skills/{skill}/mcps/`
