---

activation_mode: Model Decides
description: Standards and policy for Pull Requests.

---

# PR Policy

Pull Requests (PRs) are the gatekeepers of code quality.

## When to use

* Merging feature branches to `main`.
* Proposing changes to documentation.
* Fixing bugs.

## Workflows

* **Commit**: Use `workflows/create_commit.md` to format commits.
* **Check**: Use `workflows/check_pr.md` to validate before pushing.
* **Create**: Use `workflows/create_pr.md` to open the PR.
* **Triage**: Use `workflows/triage_feedback.md` to convert feedback into **Bugs** or **Backlog Items**.

## Lifecycle

1. **Draft**: Work in progress.
2. **Review**: Open for feedback. CI must pass.
3. **Approved**: Reviewer sign-off.
4. **Merged**: Integrated into `main`.

> [!IMPORTANT]
> **Green Build**: You cannot merge if the CI build fails. Fix it first using `workflows/fix_build.md`.
