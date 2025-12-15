---

activation_mode: Model Decides
description: Standards for [Library Name].
globs: []

---

# [Library Name] Standards

<!-- INSTRUCTION:
1. RESEARCH: Use Context7 MCP to find the latest usage guides, best practices, and patterns for [Library Name].
2. FILL:
   - __VERSION__: The version of the library used.
   - __CONFIG_FILE__: The primary configuration file path.
3. INTEGRATE PATTERNS: If this library provides specific architectural patterns (e.g. Routers, Models), document them here.
4. SEC & TEST: Research security pitfalls and testing utilities.
-->

<!-- INSTRUCTION: ACTION REQUIRED: Configure [Library Name] specific settings. -->

## Configuration

- [ ] Version: `__VERSION__` (Detected/Preferred)
- [ ] Config File: `__CONFIG_FILE__`

<!-- INSTRUCTION: MCP Recommendation: Use Context7 MCP (Upstash) to find official documentation for [Library Name]. -->

## Scaffolding

<!-- INSTRUCTION: Standard patterns and folder structures -->

- [ ] **Structure**: [e.g. `src/routers/`]
- [ ] **Boilerplate**: [e.g. `app = FastAPI()`]

## Best Practices

- **Resource Management**: [e.g., Use context managers]
- **Error Handling**: [e.g., Catch specific exceptions]
- **Performance**: [e.g., Caching strategies]

## Security Best Practices

- [ ] **Input Validation**: [e.g. "Validate all inputs"]
- [ ] **Vulnerabilities**: [Known issues to watch for]

## Testing Strategy

- [ ] **Tools**: [Compatible testing libraries, e.g. `pytest-asyncio`]
- [ ] **Patterns**: [e.g. "Mock external calls"]

## Common Pitfalls

- [ ] [Pitfall 1]
- [ ] [Pitfall 2]

## Code Snippets

```python
# Standard Initialization
```
