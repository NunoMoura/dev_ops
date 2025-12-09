---
activation_mode: manual
description: Checks for outdated documentation and stale ADRs/Bugs.
globs: "**/*.md"
---

# 🧹 Maintenance

This rule provides tools for maintaining the documentation hygiene of the project.

## Check for Stale Docs

If you suspect documentation is out of date or want to perform a hygiene check, run the `check_doc_date.py` script.

**Usage:**

```bash
python3 scripts/workflow_utils/check_doc_date.py --days 90
```

* `--days`: Number of days to consider "stale" (default: 90).

**When to use:**

* When auditing the `docs/` folder.
* Periodically (e.g., monthly) to ensure relevancy.
* If you encounter a file that seems abandoned.
