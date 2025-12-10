# Antigravity AI Guidelines

This file configures the behavior of AI Agents within Google Antigravity Editor.
It acts as a bridge to the central `docs/AGENTS.md`.

## Core Directive
**You must follow the guidelines defined in `docs/AGENTS.md`.**
Before starting any task, read `docs/AGENTS.md` to understand the "Spec-First" workflow.

## Specific Behaviors

### When asked to "Implement Feature X":
1.  First, analyze if `src/lib/schema.ts` needs changes.
2.  If yes, propose changes to `docs/api-spec.md` and `schema.ts`.
3.  Ask for user confirmation before writing implementation code.

### When asked to "Fix Bug Y":
1.  Check if there is a corresponding test in `src/services/*.test.ts`.
2.  If not, create a reproduction test case first.

### Context Awareness
- **Always** consider `src/types/index.ts` as the source of truth for interfaces.
- **Reference** `docs/architecture.md` when deciding where to place new files.
