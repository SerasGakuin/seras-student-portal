# Permission System Documentation

This document defines the permission model for the Seras Student Portal.
It serves as the source of truth for automated testing of API endpoints and verify access control logic.

## User Roles & Statuses

Users are categorized by their `status` and `grade` stored in the Student Database (Google Sheets).

| Role | Definition in Code | Notes |
| :--- | :--- | :--- |
| **Guest** | Not logged in, or `status` not recognized | Public access only |
| **Student** | Logged in via LINE, `status: '在塾'` | Regular students |
| **Teacher** | Logged in via Google, OR LINE with `status: '在塾(講師)'` | Teachers |
| **Principal** | Logged in via Google (specific email), OR LINE `status: '教室長'` | Administrator |

## API Access Matrix

| Endpoint | Method | Guest | Student | Teacher | Principal | Notes |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `/api/occupancy/status` | POST | ❌ | ❌ | ❌ | ✅ | Only Principal can open/close buildings |
| `/api/occupancy` | GET | ✅ | ✅ | ✅ | ✅ | Public view for guests, detailed view for members |
| `/api/ranking` | GET | ❌ | ✅ | ✅ | ✅ | Requires authentication |
| `/api/dashboard/stats` | GET | ❌ | ❌ | ✅ | ✅ | Teachers & Principal only |
| `/api/dashboard/student-detail` | GET | ❌ | ✅ (Self) | ✅ (All) | ✅ (All) | Students can only view their own data |

## Feature Permissions (Client-Side)

Defined in `src/lib/config.ts`.

- **VIEW_OCCUPANCY_MEMBERS**: Can see who is currently in the room.
  - Allowed: `['教室長', '在塾(講師)', '在塾']`
- **OPERATE_BUILDING_STATUS**: Can toggle Open/Close status.
  - Allowed: `['教室長']`
- **VIEW_DASHBOARD**: Can access the `/dashboard` page.
  - Allowed: `['教室長', '在塾(講師)']`

## Authentication Logic

Authentication is handled by `src/lib/authUtils.ts` -> `authenticateRequest`.

1. **Google Auth**: Checks session cookie. If valid email -> Role: Teacher/Principal.
2. **LINE Auth**: Checks `x-line-user-id` header. Looks up user in DB.
   - If found, determines permissions based on `status`.
   - If not found -> Guest.

## Verification
The security rules defined above are enforced by automated integration tests located in `src/__tests__/integration/`.

Verified scenarios include:
1. **Public/Protected Split**: `/api/occupancy` is public, while `/api/ranking` properly rejects guests (401).
2. **Dashboard Security**: Verified that Students receive `401 Unauthorized` (or Forbidden) when attempting to access `/api/dashboard/stats`, effectively blocking access.
3. **Data Privacy**: Verified that `/api/dashboard/student-detail` blocks students from viewing others' data (403 Forbidden) while allowing access to their own.
4. **Operation Security**: Verified that `POST /api/occupancy/status` rejects Teachers and Guests, allowing only Principals.

Run `npm test` to validate these rules.
