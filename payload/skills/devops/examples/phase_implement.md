# Example: Implement Phase

**Goal:** Write compiling, tested code that fulfills the Plan.

**Inputs:**

1. `task.md` (the checklist and goal).
2. `SPEC.md` (the source of truth).

**Actions:**

1. Agent reads checklist from `task.md`.
2. Agent reads `decision_trace.md` to see if there is previous context or failures for rework.
3. Agent writes tests for the new features (TDD).
4. Agent writes implementation code to make tests pass.
5. Agent runs tests using the terminal tool.

**Output:**
Working code and passing tests pushed to disk.

**Next Action:**
The agent STOPS leaving the tests passing. The human reviews the code and moves the card to the Verify phase.
