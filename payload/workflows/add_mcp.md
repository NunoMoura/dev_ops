---
description: Add an MCP server to a skill phase. Usage: /add_mcp {mcp_name}
---

# Add MCP Workflow

Add an MCP (Model Context Protocol) server to enhance a development phase.

## Usage

```markdown
/add_mcp {mcp_name}
```

Example: `/add_mcp context7`

## Steps

### 1. Research the MCP

Search for the MCP by name:

- Look up documentation (npm, GitHub, MCP registries)
- Understand what capabilities it provides
- Note any authentication requirements

### 2. Determine Best Phase

Based on MCP capabilities, suggest the most appropriate skill/phase:

| MCP Purpose | Best Phase |
|-------------|------------|
| Documentation, research, APIs | `understand_phase` |
| Planning, project management | `plan_phase` |
| Code generation, databases | `build_phase` |
| PRs, issues, testing | `verify_phase` |

Ask user to confirm or choose different phase.

### 3. Detect IDE

Check which IDE is being used:

- **Antigravity**: Config at `~/.gemini/antigravity/settings/mcp_config.json`
- **Cursor**: Config at `.cursor/mcp.json` or `~/.cursor/mcp.json`

### 4. Install MCP

Add the MCP configuration to the IDE's config file.

**Typical MCP config format:**

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

If config file exists, merge the new MCP. If not, create it.

### 5. Test the MCP

Verify the MCP is working:

- Check if MCP server starts without errors
- Try a simple operation if possible
- Report any issues to user

### 6. Create Capability File

Create a capability file in the skill's `mcps/` folder:

```bash
# Path: .agent/skills/{phase}_phase/mcps/{mcp_name}.md
```

**File format:**

```markdown
---
name: {mcp_name}
description: {brief description of what it does}
---

# {MCP Name}

{Description of capabilities}

## When to Use

- {Use case 1}
- {Use case 2}

## Available Tools

- {tool_name}: {description}
```

### 7. Report Success

Tell the user:

- ✅ MCP installed
- ✅ Added to {phase}_phase
- ⚠️ Restart IDE if needed
- 📝 Capability file created at {path}

## Error Handling

- If MCP not found: Suggest similar MCPs or ask for package name
- If auth required: Guide user through token setup
- If install fails: Show error and suggest manual installation
