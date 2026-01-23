---
name: understand-phase
description: Research deeply before planning. Use when in the Understand phase, when you need to analyze requirements, or when scoping work.
---

# Understand Phase

> Know more about the problem than the person who wrote the trigger doc.

## When to Use This Skill

- Task is in Understand column
- Need to research before planning
- Scoping work or analyzing requirements

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| TASK + trigger + SPEC.md files | RES-XXX research doc | Plan |

## Step 1: Define Scope

Document what's in and out of scope explicitly:

**In Scope**: Components, files, and behaviors you will change
**Out of Scope**: Related areas you explicitly won't touch

## Step 2: Analysis via REPL (RLM Pattern)

**Goal**: Understand large codebases without reading every file.

Instead of just `view_file` on many files, write and execute Python scripts to analyze the codebase programmatically.

### 1. Setup
Create a temporary analysis script:
```bash
touch analysis.py
```

### 2. Import Tools
Use the provided helper library for common tasks:
```python
import sys
sys.path.append("/home/nunoc/projects/dev_ops/.agent/skills/understand_phase/scripts")
from analysis_utils import find_definitions, get_imports, grep_context, detect_stack

# 1. Detect Stack (Always do this first)
stack = detect_stack()
print("Stack Detection:", stack)

# 2. Find specific code elements
# Example: Find all classes inheriting from 'BaseController'
matches = grep_context("class .*\(BaseController\):", "src")
for m in matches:
    print(f"Found controller: {m['file']}:{m['line']}")
```

### 3. Execute
Run your script and observe the output:
```bash
python3 analysis.py
```

### 4. Iterate
Refine your script based on findings. "Fold" the context by keeping only the relevant insights in your script/output.

## Step 3: Navigate SPEC.md Files

**Do NOT open code files in this phase.** Work only with SPEC.md files.

### Discover Components

```bash
find . -name SPEC.md
```

### Filter by Keywords

```bash
grep -r "keyword" */SPEC.md
```

### Drill into Relevant SPECs

Read matched SPEC.md files to understand:

- `## Structure`: Folder/file layout and purposes
- `## Key Exports`: Important interfaces exposed to other components
- `## Constraints`: Rules that cannot be violated
- `## Dependencies`: Links to other SPEC.md files

### Cross-SPEC Validation

For each dependency in `## Dependencies`:

1. Verify linked SPEC.md exists
2. Check that expected interfaces are defined
3. Flag any mismatches

## Step 3: External Research

- Library/framework documentation
- Research papers, best practices
- Known issues or edge cases

## Step 4: Challenge Assumptions

- Is this the right approach?
- Are there simpler alternatives?
- What constraints aren't written down?

## Step 5: Update SPEC.md if Needed

If you discover drift between SPECs and reality, update SPEC.md now.

## Step 6: Create Research Artifact

Document findings using the research template.

**Template:** `.dev_ops/templates/artifacts/research.md`

See `.agent/skills/understand_phase/examples/research_doc.md` for a complete example.

## Exit Criteria

- [ ] Scope defined (explicit in/out)
- [ ] SPEC.md files reviewed (no code files opened)
- [ ] Cross-SPEC dependencies validated
- [ ] External resources reviewed
- [ ] Risks and edge cases documented
- [ ] RES-XXX artifact created
- [ ] Can explain "what" and "why" to another dev
