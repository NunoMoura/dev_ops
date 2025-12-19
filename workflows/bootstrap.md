---
description: Bootstrap the project with Agent Rules.
---

# Bootstrap Workflow

## Relations

- **Upstream**:
  - **Install**: `vendor/` (Project must be vendored first)
- **Downstream**:
  - **Rules**: `.agent/rules/` (Rules installed)
  - **Scripts**: `dev_ops/scripts/` (Scripts installed)

## Steps

1. Run `python3 dev_ops/scripts/setup_ops.py` (or use **DevOps: Initialize** command).
2. The script will detect your project's coding languages, linters,
   and libraries.
3. **Dynamic Rule Generation**:
   - For each detected Language, Linter, or Library:
     - Copy the corresponding `_template.md` to
       `.agent/rules/[category]/[name].md`.
     - **RESEARCH**: Use **Context7 MCP** to find the **latest official
       documentation** and **best practices** for that specific
       tool/library.
     - **FILL TEMPLATE**: Populate the new rule file with specific
       instructions, configuration patterns, and best practices found
       during research.
     - **INCLUDE PATTERNS**: If the library implies specific architectural
       patterns (e.g., FastAPI -> Routers), include those patterns
       directly in the library's rule file.
     - **UPDATE YAML**: Update the `globs` at the top of the file to
       ensure the rule activates for relevant files.
4. Rules will be installed to `.agent/rules/`.
5. Artifact directories (plans, research, tests, bugs, adrs) will be
   created in `dev_ops/`.

## Exit Criteria

- [ ] `.agent/rules/` is populated with customized rules.
