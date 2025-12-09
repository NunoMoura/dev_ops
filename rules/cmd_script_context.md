---
activation_mode: manual
description: Provides high-level project structure and statistics.
globs: "*"
---

# 🧠 Project Context

This rule allows the Agent to quickly grasp the project structure and file distribution without scanning every file manually.

## Summarize Project

To get a token-efficient summary of the repository (file counts, types, top-level directories):

**Usage:**

```bash
python3 scripts/shared_utils/project_summary.py
```

**When to use:**

* At the start of a session if you are unfamiliar with the repo.
* To understand the "shape" of the project (e.g., is it mostly Python or TypeScript?).
* Before refactoring to see the volume of files involved.
