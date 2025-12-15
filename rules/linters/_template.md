---

activation_mode: Glob
description: Standards for [Linter/Tool Name].
globs: ["**/*[config_file_ext]", "**/*.[source_ext]"]

---

# [Linter Name] Config

<!-- INSTRUCTION:
1. RESEARCH: Use Context7 MCP to find the latest configuration options and best practices for [Linter Name].
2. FILL:
   - __LINTER_VERSION__: Detected version.
3. CONFIG: Populate the `Configuration` section with the standard config file pattern.
4. STRATEGIES: Research how to safely fix common errors ("Fix Strategy").
5. YAML: Update `globs` to match config files and source files (e.g. `["**/*.ts", "**/.eslintrc.json"]`).
-->

<!-- INSTRUCTION: Agent, please fill in the [Linter Name] configuration. -->

## Configuration

- [ ] Version: `__LINTER_VERSION__`
- [ ] Config File: `[filename]`

<!-- INSTRUCTION: MCP Recommendation: Use Context7 MCP (Upstash) to find official documentation for the linter. -->

## Rules & Enforcements

- **Strictness**: [e.g. Strict/pedantic/lenient]
- **Ignored Rules**:
  - [ ] `[Rule ID]`: [Reason]

## Fix Strategy

<!-- INSTRUCTION: How to handle common violations -->

- [ ] **Auto-Fix**: [Can we adhere to `fix --all`? or manual review?]
- [ ] **False Positives**: [How to suppress? e.g. `// ignore: rule-id`]

## CI/CD Integration

- [ ] Command: `[Command to run in CI]`
- [ ] Failure Policy: [Fail build on warning?]

## IDE Integration

- [ ] Extension: `[Extension Name]`
- [ ] Settings: [Crucial VSCode settings]
