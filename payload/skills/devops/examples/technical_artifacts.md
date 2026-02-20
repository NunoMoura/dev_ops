# Technical Artifact Examples

These examples show how to create technical artifacts that drive the development process.

## 1. Component Specification (SPEC)

**Trigger**: "Create a spec for the Button component"
**Template**: `assets/spec.md`
**Output Path**: `src/components/Button/SPEC.md` (Next to code)

```markdown
# Spec: Button Component

## Purpose
A reusable button component with variant support.

## API
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  onClick: () => void;
  children: React.ReactNode;
}
```

## Behavior

- **Hover**: Lighten background by 10%
- **Active**: Darken background by 10%
- **Disabled**: Opacity 0.5, no pointer events

## Accessibility

- Must have `role="button"` (if div) or use `<button>`
- Must support keyboard focus

## 2. Bug Report

**Trigger**: "Log a bug about the crash on checkout"
**Template**: `assets/bug.md`
**Output Path**: `.dev_ops/docs/bug-checkout-crash.md`

```markdown
---
type: bug
severity: critical
status: open
---

# Bug: Checkout Crash on Mobile

## Description
Clicking "Pay Now" on iOS Safari causes a white screen crash.

## Steps to Reproduce
1. Open site on iPhone (Safari)
2. Add item to cart
3. Proceed to checkout
4. Click "Pay Now"

## Expected Behavior
Payment modal should open.

## Actual Behavior
App crashes (White screen).

## Logs/Screenshots
## 3. Task File

**Trigger**: `create-task` CLI command (auto-generates this file)
**Template**: `assets/task.md`
**Path**: `.dev_ops/tasks/TASK-XXX/task.md`

```markdown
---
id: TASK-123
title: Refactor Auth Service
type: task
date: 2023-10-01
column: col-in-progress
status: in_progress
priority: high
trigger: PLN-001
---

# TASK-123 - Refactor Auth Service

## Context
Read the trigger doc for context: DOC-001

## Notes
- Encountered circular dependency in `User.ts`, resolving by extracting interface.
- Need to update generic `Repository` class.

## Checklist
- [x] Create AuthService <!-- id: 1 -->
- [x] Update User model <!-- id: 2 -->
- [ ] Migrate existing tests <!-- id: 3 -->
- [ ] Verify login flow <!-- id: 4 -->
```
