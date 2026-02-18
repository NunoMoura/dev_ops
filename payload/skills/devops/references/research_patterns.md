# Research Patterns & Strategies

> detailed guidelines for effective context gathering.

## 1. RLM Zoom-Out (The "Map")

Before diving into code, understand where you are.

- **Goal**: Identify *all* affected components.
- **Tool**: `find . -name SPEC.md` or `grep` to locate relevant specs.
- **Anti-Pattern**: Reading implementation files (`.ts`, `.py`) before reading the Spec.

## 2. Dependencies Analysis

- **Check**: `package.json`, `go.mod`, or `requirements.txt`.
- **Check**: `imports` in the entry point file.
- **Goal**: Know what external libraries are in play *before* you start coding.

## 3. Scope Definition (The "Fence")

Explicitly define what you will *ignore*.

| In Scope | Out of Scope |
| :--- | :--- |
| This component | That component |
| This API | That Database |

## 4. Context Loading Strategy

1. **High Level**: Read `README.md` and root `SPEC.md`.
2. **Mid Level**: Read component `SPEC.md`.
3. **Low Level**: Read interface definitions (e.g., `.d.ts` or similar).
4. **Implementation**: *Only* read when necessary for debugging or specific logic verification.

## 5. Troubleshooting "Unknowns"

- **Unknown Library**: Read the official docs (search web).
- **Unknown Codebase**: Use `grep` to find usage examples of core functions.
- **Unknown Error**: Search for the error message in the codebase to see where it's raised.
