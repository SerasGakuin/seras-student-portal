# Comprehensive Test Plan

This document outlines the plan to implement a comprehensive test suite for the Seras Student Portal, ensuring robustness across all features and permission levels.

## 1. Objectives
- **Coverage**: Verify all core business logic and API endpoints.
- **Security**: Ensure strict permission checks (Guest/Student/Teacher/Principal) for every protected resource.
- **Reliability**: Decouple tests from external services (Google Sheets, LINE, Calendar) using mocks.

## 2. Testing Strategy
We will use **Jest** as the test runner. The testing strategy follows the "Test Pyramid," focusing heavily on Service Layer Unit Tests and API Integration Tests.

### Tools & pattern
- **Runner**: `jest`
- **Environment**: `node`
- **Mocking**: `jest.mock` for external dependencies (`googleapis`, `@line/liff`, etc).
- **API Tests**: Use `NextRequest` / `NextResponse` objects directly to simulate HTTP calls.

## 3. Test Inventory & Implementation Order

We will implement tests in the following order:

### Phase 1: Core Service Logic (Unit Tests)
These tests verify the business rules without involving HTTP or Routing layers.

1.  **`src/services/studentService.test.ts`**
    -   Parsing student data from raw arrays.
    -   Normalizing names and grades.
    -   Handling missing or malformed data.
2.  **`src/services/badgeService.test.ts`**
    -   Calculating weekly study time.
    -   Verifying badge assignment logic (HEAVY_USER, EARLY_BIRD, etc.).
    -   Ensuring correct grouping (Exam vs General).
3.  **`src/services/dashboardService.test.ts`**
    -   Calculating stay duration (difference between entry/exit).
    -   Applying the 4-hour / 22:00 auto-cap logic for missing exit times.
    -   Handling rolling window period calculations.
4.  **`src/services/occupancyService.test.ts`**
    -   Counting active members per building.
    -   Identifying teachers vs students in the room.
5.  **`src/services/calendarService.test.ts`**
    -   Formatting event data for Google Calendar.
    -   Timezone handling (JST).

### Phase 2: API Integration & Security (Integration Tests)
These tests verify that the API Routes correctly connect Auth, Validation, and Services.

6.  **`src/__tests__/integration/api_structure.test.ts`**
    -   Global verification that ALL GET APIs return `{ status: 'ok', data: ... }` format.
7.  **`src/__tests__/integration/dashboard_api.test.ts`**
    -   Verify `/api/dashboard/stats` allows Teachers/Principals but rejects Students (403).
    -   Verify `/api/dashboard/student-detail` allows students to view ONLY their own data.
8.  **`src/__tests__/integration/occupancy_api.test.ts`**
    -   Verify `/api/occupancy` is public.
    -   Verify `/api/occupancy/status` (POST) is Principal-only.

## 4. Current Progress
- [x] Ranking API Integration Test (`src/__tests__/integration/ranking-api.test.ts`)
- [ ] Service Tests (Phase 1)
- [ ] Remaining API Tests (Phase 2)

## 5. Execution
Run all tests with:
```bash
npm test
```
