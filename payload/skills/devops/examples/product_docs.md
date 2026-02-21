# Product Documentation Examples

These examples demonstrate how to create high-quality product documentation using the standard templates.

## 1. Product Requirements Document (PRD)

**Trigger**: "Create a PRD for the new User Dashboard"
**Template**: `assets/prd.md`
**Output Path**: `.dev_ops/docs/prd-user-dashboard.md`

```markdown
---
type: prd
status: draft
owner: Product Team
---

# PRD: User Dashboard Overhaul

## 1. Overview
Redesign the user dashboard to improve engagement and provide clearer metrics.

## 2. Goals
- Increase daily active users by 10%
- Reduce support tickets related to "finding settings" by 20%

## 3. User Stories
- As a user, I want to see my recent activity immediately upon login.
- As an admin, I want to pin important announcements.

## 4. Technical Constraints
- Must load within 1.5 seconds.
- Must be responsive (mobile-first).
```

## 2. Feature Specification

**Trigger**: "Spec out the 'Dark Mode' feature"
**Template**: `assets/feature.md`
**Output Path**: `.dev_ops/docs/features/feature-dark-mode.md`

```markdown
---
type: feature
feature: Dark Mode
---

# Feature: Dark Mode Support

## Context
Users report eye strain during night usage.

## Requirements
- Toggle in user settings
- Auto-detect system preference
- Persist preference across sessions

## UI/UX
- Use Slate-900 for background
- Use Slate-100 for primary text
```

## 3. User Persona

**Trigger**: "Define our target developer persona"
**Template**: `assets/persona.md`
**Output Path**: `.dev_ops/docs/personas/persona-dev-dave.md`

```markdown
---
role: Senior Developer
name: Dev Dave
---

# Persona: Dev Dave

## Bio
Dave is a senior backend engineer who loves CLI tools and hates context switching.

## Goals
- Automate repetitive tasks
- Ship code faster without breaking things

## Frustrations
- Slow CI/CD pipelines
- Ambiguous requirements
```

## 4. User Story

**Trigger**: "Write a user story for login"
**Template**: `assets/story.md`
**Output Path**: `.dev_ops/docs/stories/story-login.md`

```markdown
# Story: User Login

**As a** registered user
**I want to** log in with my email and password
**So that** I can access my private dashboard

## Acceptance Criteria
- [ ] Valid credentials redirect to dashboard
- [ ] Invalid credentials show error message
- [ ] "Forgot Password" link is visible
```

## 5. UI Mockup

**Trigger**: "Create a mockup for the dashboard"
**Template**: `assets/mockup.md`
**Output Path**: `.dev_ops/docs/mockups/mockup-dashboard.md`

````markdown
---
id: MOCKUP-001
title: Dashboard V2
type: mockup
date: 2023-10-27
status: Draft
fidelity: Low
---


# MOCKUP-001 - Dashboard V2

## Design

```text
┌──────────────────────────────┐
│  [Logo]    Search...      [User] │
├──────┬───────────────────────┤
│ Nav  │  Welcome back, Dave!  │
│      │                       │
│ Home │  [ Recent Activity ]  │
│ Sett │  - Login (Today)      │
│      │  - Push (Yesterday)   │
└──────┴───────────────────────┘
```

## Interactions
- **Click [User]**: Opens dropdown menu.
- **Hover Nav**: Highlighting primary color.
````
