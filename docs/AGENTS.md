# AI Agent Guidelines

This file is the Single Source of Truth for AI Agents (Cursor, Copilot, Antigravity, etc.) working on this repository.

## Rule 1: Spec-First Development (仕様書駆動)
**NEVER** start implementing code without updating the specification first.
1.  **Define Types/Schemas**: Update `src/lib/schema.ts` (Zod) and `src/types/index.ts`.
2.  **Update API Spec**: Update `docs/api-spec.md`.
3.  **Implement**: Only then, write the actual code.

## Rule 2: Documentation Synchronization (ドキュメント同期)
**ALWAYS** keep documentation in sync with code.
- If you add an Environment Variable -> Update `docs/setup.md`
- If you change Directory Structure -> Update `docs/architecture.md`
- If you change DB Schema -> Update `docs/database.md`

## Rule 3: Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Auth**: LINE LIFF v2
- **Validation**: Zod (Strict validation required)
- **Testing**: Jest (Unit tests for Services are MANDATORY)

## Rule 4: Architecture Constraints
- **Do not put business logic in UI Components**. Delegates to `src/services`.
- **Do not call `fetch` directly**. Use `src/lib/api.ts`.
