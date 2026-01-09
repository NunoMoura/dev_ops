---
description: Explain project, component, or code structure
category: guided
---

# Explain

Explain the project, a component, or a specific piece of code in a structured way.

## Inputs

- `input`: (Optional) The target to explain (file, folder, class, or empty for "whole project").

## Steps

1. **Identify Target**:
   - If `{input}` is empty, default to **Project**.
   - If `{input}` is a path/symbol, target that specific scope.

2. **Analyze**:
   - Read relevant files, docs, or code.
   - For **Project**: Read `README.md`, `nonnegotiables.md`, `docs/prds/*.md`, `docs/ux/**/*.md`, and key architecture files.
   - For **Component/Code**: Read source code, tests, and usage.

3. **Structure Output**:
   Provide explanation using this format:

   ### [Target Name]

   **Purpose**
   > One sentence summary of what it does and why it exists.

   **Context**
   > Where does it fit in the system? Who uses it?

   **Inner Workings**
   > How does it function? Key logic flows, algorithms, or state management.

   **Key Components** (if applicable)
   - List main classes, functions, or sub-modules.
