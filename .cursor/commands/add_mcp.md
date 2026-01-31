---
description: Add an MCP server to a skill phase. Usage: /add_mcp {mcp_name}
category: guided
---

# Add MCP Workflow

Add an MCP (Model Context Protocol) server to enhance a development phase.

## Usage

```markdown
/add_mcp {mcp_name}
```

Example: `/add_mcp context7`

Search for the MCP by name:

- Look up documentation (npm, GitHub, MCP registries)
- Understand capabilities
- Note authentication requirements

## Step 2: Determine Phase

Select the most appropriate skill/phase based on capabilities:

| MCP Purpose | Phase |
|-------------|-------|
| Documentation, Research | `understand` |
| Planning, PM | `plan` |
| Code gen, DBs | `build` |
| PRs, Testing | `verify` |

## Step 3: Configure IDE

Add MCP to `~/.gemini/antigravity/mcp_config.json` (Antigravity) or `.cursor/mcp.json` (Cursor).

**Config format:**

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

## Step 4: Verify & Document

1. Verify MCP starts without errors.
2. Create capability file at `.agent/skills/{skill}/mcps/{mcp_name}.md`.

## Error Handling

- **Not Found**: Ask for package name.
- **Auth Required**: Guide user through token setup.

## Outputs

- MCP configuration added to IDE config file
- Capability file in `.agent/skills/{skill}/mcps/`
