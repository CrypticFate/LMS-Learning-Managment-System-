# Plan 02 — Core Features & Role-Based Access Control (RBAC)

> **Scope:** The 4 roles + permission matrix, role seeding, authentication, the **authoritative backend authorization layer** (policies), and the 4 core features: (1) Auth + role-based access, (2) Course management, (3) Enrollment, (4) Lesson viewing. Plans 03–06 build differentiators on top of this.
>
> **The single most-graded thing in this round:** *"Getting this 4-role access control right — cleanly, without leaks."* and *"Enforce this on the backend, not just by hiding buttons."* Treat every rule below as a hard requirement.

Assumes the structure, auth architecture, `strapiFetch`, and `getCurrentUser()` from **Plan 01**.

---

## 1. Roles & permission matrix

Four roles, one per user:

- **Admin** — full control. Manages users + assigns/changes roles. Can do everything.
- **Content Manager (CM)** — creates/manages **any** course + lessons (the content library) and writes blog posts. Does **not** manage users.
- **Instructor** — manages lessons + quizzes of **their own** courses only; can see progress of students in their own courses.
- **Student** — enrolls, views lessons, takes quizzes, tracks their **own** progress.

| Action | Admin | Content Manager | Instructor | Student |
|---|:--:|:--:|:--:|:--:|
| Manage users & assign roles | ✅ | ❌ | ❌ | ❌ |
| Create / edit / delete course | ✅ any | ✅ any | ✅ **own only** | ❌ |
| Add / edit / delete lessons | ✅ any | ✅ any | ✅ **own courses** | ❌ |
| Create quizzes | ✅ any | ✅ any | ✅ **own courses** | ❌ |
| View student progress | ✅ any | ✅ any | ✅ **own courses** | ✅ **own only** |
| Write / manage blog posts | ✅ any | ✅ own | ❌ | ❌ |
| Enroll in a course | ❌ | ❌ | ❌ | ✅ |
| Take quizzes | ❌ | ❌ | ❌ | ✅ |

> "Own" = the resource's `owner` (course) or `author` (blog) equals the requesting user. Admin and CM are never ownership-scoped for courses/lessons; Instructor always is.

---

## 2. Data models (core)

Create these content-types in Strapi. **Disable native Draft & Publish on all of them** (`"draftAndPublish": false`) — we control visibility explicitly. Blog uses its own status enum (Plan 06).

### 2.1 Extend `User` (users-permissions)
Keep the built-in `User` with its `role` relation. No extra fields required for core. (The `role` relation drives everything.)

### 2.2 `Course` — `api::course.course`
| Field | Type | Notes |
|---|---|---|
| `title` | string, required | |
| `slug` | uid (target `title`) | for public URLs |
| `description` | text | |
| `coverImageUrl` | string | optional URL |
| `owner` | relation: manyToOne → User | **creator = ownership anchor** |
| `lessons` | relation: oneToMany → Lesson | |
| `enrollments` | relation: oneToMany → Enrollment | |
| `quizzes` | relation: oneToMany → Quiz | (Plan 04) |

### 2.3 `Lesson` — `api::lesson.lesson`
| Field | Type | Notes |
|---|---|---|
| `title` | string, required | |
| `content` | text (long) | lesson body (text) |
| `videoUrl` | string | optional video URL |
| `order` | integer, default 0 | **sequence** for ordered viewing |
| `course` | relation: manyToOne → Course | |

Content is **text OR a video URL** (either/both). Ordering is by `order` ascending.

### 2.4 `Enrollment` — `api::enrollment.enrollment`
| Field | Type | Notes |
|---|---|---|
| `student` | relation: manyToOne → User | |
| `course` | relation: manyToOne → Course | |
| `enrolledAt` | datetime | set on create |

> **Uniqueness:** a student may enroll in a course only once. Strapi doesn't enforce composite uniqueness on relations, so enforce it in the controller (Section 6.3) by checking for an existing enrollment before create → return `409` if present.

---

## 3. Seed roles, default role, and demo accounts (bootstrap)

`backend/src/index.ts` — the `bootstrap` runs on every start. Make it idempotent.

```ts
import { ROLE } from './constants/roles';

export default {
  register() {},
  async bootstrap({ strapi }) {
    const upService = strapi.plugin('users-permissions').service('role');

    // 1) Ensure the 4 app roles exist (names MUST match Plan 01 constants)
    const wanted = [ROLE.ADMIN, ROLE.CONTENT_MANAGER, ROLE.INSTRUCTOR, ROLE.STUDENT];
    const existing = await strapi.query('plugin::users-permissions.role').findMany();
    const byName = Object.fromEntries(existing.map((r) => [r.name, r]));

    for (const name of wanted) {
      if (!byName[name]) {
        const created = await strapi.query('plugin::users-permissions.role').create({
          data: { name, description: `${name} role`, type: name.toLowerCase().replace(/\s+/g, '_') },
        });
        byName[name] = created;
      }
    }

    // 2) Default role for new signups = Student
    await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .set({ value: { ...(await strapi.store({ type: 'plugin', name: 'users-permissions', key: 'advanced' }).get()), default_role: byName[ROLE.STUDENT].type } });

    // 3) Seed one demo user per role (only if none exist) so reviewers can log in
    const seed = [
      { email: 'admin@lms.test',      username: 'admin',      role: ROLE.ADMIN },
      { email: 'manager@lms.test',    username: 'manager',    role: ROLE.CONTENT_MANAGER },
      { email: 'instructor@lms.test', username: 'instructor', role: ROLE.INSTRUCTOR },
      { email: 'student@lms.test',    username: 'student',    role: ROLE.STUDENT },
    ];
    for (const s of seed) {
      const found = await strapi.query('plugin::users-permissions.user').findOne({ where: { email: s.email } });
      if (!found) {
        await strapi.plugin('users-permissions').service('user').add({
          email: s.email, username: s.username,
          password: 'Passw0rd!', confirmed: true, blocked: false,
          role: byName[s.role].id, provider: 'local',
        });
      }
    }
  },
};
```

> Put the 4 demo credentials in the README. **Signup default = Student**; Admin promotes users to CM/Instructor from the Admin Panel (Plan 05). Do **not** let signup choose Admin.

### 3.1 Users-permissions route access
Enable, per role, the endpoints below (Settings → Users & Permissions → Roles, or via a bootstrap permission grant). **Policies are still authoritative** — this just lets authenticated users reach the routes.

- **Public:** `course.find`, `course.findOne`, `blog-post.find`, `blog-post.findOne`.
- **Authenticated (all logged-in roles):** the custom endpoints in this and later plans (`enrollment.*`, `progress.*`, `quiz` take/submit, etc.). Role/ownership is then decided by the policy on each route, **not** by the checkbox.

---

## 4. Authorization — the "no leaks" layer (READ THIS TWICE)

Authorization is enforced by **global policies** attached to routes. A policy runs **before** the controller; if it returns `false`, Strapi responds `403` and the controller never executes. This is the backend enforcement the video must demonstrate.

Two categories:
1. **Role check** — is the user's role allowed to hit this action at all?
2. **Ownership check** — for owner-scoped actions, does the user own the specific record?

### 4.1 `has-any-role` — `src/policies/has-any-role.ts`
```ts
export default (policyContext, config: { roles: string[] }, { strapi }) => {
  const user = policyContext.state.user;
  if (!user) return false;                    // not authenticated
  return config.roles.includes(user.role?.name);
};
```
Usage in a route: `config: { policies: [{ name: 'global::has-any-role', config: { roles: ['Admin','Content Manager','Instructor'] } }] }`.

### 4.2 `is-admin` — `src/policies/is-admin.ts`
```ts
import { ROLE } from '../constants/roles';
export default (policyContext) => policyContext.state.user?.role?.name === ROLE.ADMIN;
```

### 4.3 `can-manage-course` — `src/policies/can-manage-course.ts`
The core ownership policy for course/lesson/quiz **create/update/delete**. Admin + CM pass unconditionally; Instructor passes only for their own course.
```ts
import { ROLE } from '../constants/roles';

// Resolves the course documentId from either the route param (course op)
// or the body (lesson/quiz op referencing a course).
async function resolveCourse(ctx, strapi) {
  // Course update/delete: /courses/:documentId
  if (ctx.params?.documentId && ctx.request.url.includes('/courses/')) {
    return strapi.documents('api::course.course').findOne({
      documentId: ctx.params.documentId, populate: { owner: true },
    });
  }
  // Lesson/quiz create: body.data.course is a course documentId
  const courseDocId = ctx.request.body?.data?.course;
  if (courseDocId) {
    return strapi.documents('api::course.course').findOne({
      documentId: courseDocId, populate: { owner: true },
    });
  }
  return null;
}

export default async (policyContext, _config, { strapi }) => {
  const ctx = policyContext;
  const user = ctx.state.user;
  if (!user) return false;

  const role = user.role?.name;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true; // any
  if (role !== ROLE.INSTRUCTOR) return false;                            // students blocked

  const course = await resolveCourse(ctx, strapi);
  if (!course) return false;
  return course.owner?.id === user.id;                                   // own only
};
```
> For **lesson/quiz update/delete** (`/lessons/:documentId`, `/quizzes/:documentId`), write sibling policies `can-manage-lesson` / `can-manage-quiz` that load the record, populate `course.owner`, and apply the same Admin/CM-any + Instructor-own rule. (Same shape, different lookup.)

### 4.4 `is-enrolled` — `src/policies/is-enrolled.ts`
Gate student-only actions (view lesson content, take/submit quiz, mark progress) so only enrolled students proceed.
```ts
import { ROLE } from '../constants/roles';
export default async (policyContext, _config, { strapi }) => {
  const user = policyContext.state.user;
  if (user?.role?.name !== ROLE.STUDENT) return false;

  // courseDocumentId from param or body — adapt per route
  const courseDocId =
    policyContext.params?.courseDocumentId ??
    policyContext.request.body?.data?.course;
  if (!courseDocId) return false;

  const [enrollment] = await strapi.documents('api::enrollment.enrollment').findMany({
    filters: { student: user.id, course: { documentId: courseDocId } },
    limit: 1,
  });
  return Boolean(enrollment);
};
```

> **Golden rule:** UI hiding is never the enforcement. Every restricted action above is blocked at the policy even if someone calls the API directly with a valid JWT of the wrong role.

---

## 5. Core Feature 1 — Authentication + Role-based access

### 5.1 Backend
- Use built-in U&P auth: `POST /api/auth/local/register` (→ default Student role) and `POST /api/auth/local` (login). Both return `{ jwt, user }`.
- `GET /api/users/me?populate=role` returns the current user with role.

### 5.2 Frontend — Server Actions (`features/auth/actions.ts`)
```ts
'use server';
import { cookies } from 'next/headers';

const BASE = process.env.STRAPI_URL!;

export async function login(_: unknown, form: FormData) {
  const res = await fetch(`${BASE}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: form.get('email'), password: form.get('password') }),
  });
  if (!res.ok) return { ok: false, error: 'Invalid email or password' };
  const { jwt } = await res.json();
  (await cookies()).set('lms_jwt', jwt, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7,
  });
  return { ok: true };
}

export async function register(_: unknown, form: FormData) {
  const res = await fetch(`${BASE}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: form.get('username'),
      email: form.get('email'),
      password: form.get('password'),
    }),
  });
  if (!res.ok) return { ok: false, error: 'Could not register' };
  const { jwt } = await res.json();
  (await cookies()).set('lms_jwt', jwt, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 });
  return { ok: true };
}

export async function logout() {
  (await cookies()).delete('lms_jwt');
  return { ok: true };
}
```

### 5.3 Frontend — route protection
- `middleware.ts`: for `/(dashboard)` paths, if no `lms_jwt` cookie → redirect to `/login`.
- Each dashboard sub-layout (Server Component) calls `getCurrentUser()` and:
  - if `null` → redirect `/login`;
  - if role ≠ the section's role → redirect to the user's own dashboard (or `notFound()`).
```ts
// app/(dashboard)/admin/layout.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/features/auth/session';
import { ROLE } from '@/lib/constants';

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role.name !== ROLE.ADMIN) redirect('/dashboard');
  return <>{children}</>;
}
```

---

## 6. Core Feature 2 — Course Management

### 6.1 Endpoints
| Method | Path | Who | Enforcement |
|---|---|---|---|
| GET | `/api/courses` | public | U&P public read |
| GET | `/api/courses/:documentId` | public | U&P public read |
| POST | `/api/courses` | Admin, CM, Instructor | `has-any-role` + controller sets `owner` |
| PUT | `/api/courses/:documentId` | Admin/CM any; Instructor own | `can-manage-course` |
| DELETE | `/api/courses/:documentId` | Admin/CM any; Instructor own | `can-manage-course` |
| GET | `/api/courses/mine` | Instructor/CM/Admin | custom: courses owned by user (Admin/CM may return all) |

### 6.2 Course routes + controller
`src/api/course/routes/course.ts` — attach policies:
```ts
import { factories } from '@strapi/strapi';
export default factories.createCoreRouter('api::course.course', {
  config: {
    create: { policies: [{ name: 'global::has-any-role', config: { roles: ['Admin','Content Manager','Instructor'] } }] },
    update: { policies: ['global::can-manage-course'] },
    delete: { policies: ['global::can-manage-course'] },
    // find / findOne left open for public read
  },
});
```
`src/api/course/controllers/course.ts` — inject owner on create:
```ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  async create(ctx) {
    ctx.request.body.data = { ...ctx.request.body.data, owner: ctx.state.user.id };
    return super.create(ctx);
  },
}));
```
> **Why inject on the server:** never trust `owner` from the client. The owner is always the authenticated user, set server-side.

### 6.3 Lessons under a course
- `POST /api/lessons` (Admin/CM/Instructor): route policy `can-manage-course` (resolves the course from `body.data.course`) → controller validates the `course` exists.
- `PUT/DELETE /api/lessons/:documentId`: policy `can-manage-lesson` (loads lesson → `course.owner`).
- Frontend course-management UI (instructor/CM) lists lessons of a course and supports add/edit/delete with `order`.

### 6.4 Frontend
- `features/courses/` — Server Component list + detail; Server Actions `createCourse`, `updateCourse`, `deleteCourse`, `createLesson`, etc. (each attaches JWT via cookie).
- Instructor dashboard shows only **their** courses (`/api/courses/mine`); CM/Admin dashboards show all.
- **UI reflects role but does not enforce** — buttons are hidden for wrong roles purely for UX; the backend policy is the real gate.

---

## 7. Core Feature 3 — Course Enrollment (Student)

### 7.1 Endpoints
| Method | Path | Who | Enforcement |
|---|---|---|---|
| GET | `/api/courses` | public | browse catalog |
| POST | `/api/enrollments` | Student | `has-any-role({Student})` + duplicate check |
| GET | `/api/enrollments/me` | Student | custom: returns the student's enrolled courses → **"My Courses"** |

### 7.2 Enrollment controller
```ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    const courseDocId = ctx.request.body?.data?.course;
    if (!courseDocId) return ctx.badRequest('course is required');

    const [dupe] = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: { student: user.id, course: { documentId: courseDocId } }, limit: 1,
    });
    if (dupe) return ctx.conflict('Already enrolled');   // 409

    const created = await strapi.documents('api::enrollment.enrollment').create({
      data: { student: user.id, course: courseDocId, enrolledAt: new Date() },
      populate: { course: true },
    });
    return { data: created };
  },

  async me(ctx) {                                        // GET /api/enrollments/me
    const user = ctx.state.user;
    const rows = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: { student: user.id },
      populate: { course: { populate: { lessons: true } } },
    });
    return { data: rows };
  },
}));
```
Add the custom `me` route (authenticated, `has-any-role({Student})`).

### 7.3 Frontend
- `/courses` catalog with an **Enroll** button (Student only). After enroll, the course appears under `/student/my-courses`.
- "My Courses" is a distinct view sourced from `/api/enrollments/me`.

---

## 8. Core Feature 4 — Lesson Viewing (Student)

### 8.1 Rules
- Student can view lessons **only for courses they're enrolled in**, in **sequence** (`order` ascending).
- Lesson content retrieval for students is gated by `is-enrolled` (so a non-enrolled user can't pull lesson content via the API).

### 8.2 Endpoint
| Method | Path | Who | Enforcement |
|---|---|---|---|
| GET | `/api/courses/:courseDocumentId/lessons` | enrolled Student (and managers of the course) | `is-enrolled` OR `can-manage-course` |

Return lessons sorted by `order`. The frontend renders them as a sequential list; the "next/prev" navigation and the **mark-complete** action come from Plan 03.

### 8.3 Frontend
- `/student/courses/[documentId]` — sequential lesson viewer (list + selected lesson pane), text and/or embedded video.

---

## 9. Permission test matrix (must all pass — verify by calling the API directly with each role's JWT)

| # | Attempt | Expected |
|---|---|---|
| 1 | Student `POST /api/courses` | 403 |
| 2 | Instructor edits **another** instructor's course | 403 |
| 3 | Instructor edits **own** course | 200 |
| 4 | CM edits **any** course | 200 |
| 5 | CM `PUT /api/admin/users/:id/role` (Plan 05) | 403 |
| 6 | Logged-out user `GET /api/enrollments/me` | 401 |
| 7 | Student enrolls twice in same course | 409 on 2nd |
| 8 | Non-enrolled student `GET /courses/:id/lessons` | 403 |
| 9 | Client sends `owner` in course create body | ignored; owner = caller |
| 10 | Instructor `POST /api/enrollments` | 403 (not a Student) |

> Automate a few of these as a script or Postman collection; demonstrating them (especially #1, #2, #8) is exactly the "backend enforcement" the reviewers want in the video.

---

## 10. Video talking points (core)
- **Role model:** 4 roles, one relation per user; default signup = Student; Admin promotes.
- **Backend enforcement:** open a policy file, show `can-manage-course` denying an instructor on someone else's course; then hit the endpoint live with a wrong-role JWT and show the 403.
- **Data flow (pick enrollment):** button → Server Action reads httpOnly cookie → `POST /api/enrollments` → controller checks duplicate + sets `student` server-side → response → "My Courses" updates.

---

## 11. Definition of done (this plan)
- [x] 4 roles seeded; default role = Student; 4 demo accounts seeded + in README.
- [x] Register/login/logout via Server Actions; httpOnly cookie; `getCurrentUser()` works.
- [x] `has-any-role`, `is-admin`, `can-manage-course` (+ lesson/quiz siblings), `is-enrolled` policies implemented.
- [x] Course CRUD with server-set `owner`; Instructor scoped to own; CM/Admin any.
- [x] Lessons CRUD with ordering + ownership.
- [x] Enrollment with duplicate guard + "My Courses".
- [x] Sequential lesson viewing gated by enrollment.
- [x] All 10 rows of §9 pass.

**Next:** Plan 03 (Progress Tracking) builds directly on lessons + enrollment defined here.
