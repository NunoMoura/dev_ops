# Phase: Verify

> "Trust, but Verify."

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Run tests | Make code changes (except minor fixes) |
| Read `SPEC.md` | Add new features |
| Append to `decision_trace.md` | Skip security check |
| Create PR | Submit without proof |

**Required Deliverable**: `decision_trace.md` appended with test evidence + PR

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Code + Tests + `SPEC.md` | `decision_trace.md` + PR | Done |

---

## Steps

### 1. Verification

* **Action**: Run the full test suite.
* **Command**: `node .dev_ops/scripts/devops.js detect --scope tests` (to find test commands) OR `npm test`.
* **Reference**: [Verification Guide](./verification_guide.md)

### 2. SPEC Integrity Check

* **Action**: Ensure `SPEC.md` accurately reflects the codebase (Files, API, etc.).

### 3. Create Walkthrough

*3. **Trace**: Append your verification evidence to `.dev_ops/tasks/TASK-XXX/decision_trace.md`.

* **Test Results**: Paste the output of `npm test` or relevant test commands.
* **Manual Checks**: Confirm acceptance criteria are met.
* **Screenshots**: If UI changes, reference screenshot paths.

> **Note**: `decision_trace.md` is the persistent record. Do NOT create a separate walkthrough artifact.

### 4. Create PR

* **Command**: `gh pr create --title "[TASK-XXX] Title"`

## Troubleshooting

### Error: "Tests failed"

**Cause**: Implementation doesn't match Spec or regression introduced.
**Solution**: Return to **Implement** phase to fix bugs.

### Error: "PR creation failed"

**Cause**: Branch might not be pushed or auth token expired.
**Solution**: Check `git status` and `gh auth status`.

---

## Exit Criteria

* [ ] All tests pass.
* [ ] `SPEC.md` matches implementation.
* [ ] `decision_trace.md` appended with evidence.
* [ ] PR created.

---

## Next Phase

* **Success**: Move to **Done** (Task Complete).
* **Failure**: Return to **Implement** (Fix bugs) or **Plan** (Fix Spec).
