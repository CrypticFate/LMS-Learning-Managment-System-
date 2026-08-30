# Plan 05 — Differentiator 3: Admin Panel

> **Scope:** A dedicated dashboard accessible **only to Admin**. Admin can see all users and manage their roles (promote / change / remove), view and manage all courses, lessons, and blog posts across the platform, and see basic platform stats (users per role, total courses, total enrollments). Builds on Plan 02 (roles, `is-admin`) and reuses course/lesson/blog endpoints (Admin passes their ownership policies for any record).
>
> **Note:** This is a **custom admin dashboard in the Next.js app** for the `Admin` app-role — not the Strapi CMS admin panel. Keep them separate.

---

## 1. Access control (front + back)

- **Frontend:** the whole `/admin` route group sits behind `app/(dashboard)/admin/layout.tsx`, which redirects unless `getCurrentUser().role.name === 'Admin'` (see Plan 02 §5.3). Cosmetic gate.
- **Backend (authoritative):** every admin endpoint is guarded by the `is-admin` policy (Plan 02 §4.2). A CM/Instructor/Student calling an admin endpoint with a valid JWT still gets `403`.

---

## 2. Endpoints

| Method | Path | Who | Enforcement |
|---|---|---|---|
| GET | `/api/admin/users` | Admin | `is-admin` — list all users + roles |
| PUT | `/api/admin/users/:id/role` | Admin | `is-admin` — change a user's role |
| GET | `/api/admin/stats` | Admin | `is-admin` — platform stats |
| (reuse) | course/lesson/blog CRUD | Admin | Admin passes `can-manage-course` / `can-manage-blog` for **any** record |

> Roles/users live in the users-permissions plugin, so these are **custom routes** in a small `admin` API (or added under an existing API). Use `id` (numeric) for the user-role update since the U&P user is addressed by id.

---

## 3. Backend implementation

### 3.1 Create a lightweight `admin-api` (custom, no content-type)
Add `src/api/admin/routes/admin.ts` + `src/api/admin/controllers/admin.ts` (a controller not bound to a content-type is fine — export a plain controller). All routes authenticated + `is-admin`.

`src/api/admin/routes/admin.ts`:
```ts
export default {
  routes: [
    { method: 'GET',  path: '/admin/users',          handler: 'admin.listUsers',
      config: { policies: ['global::is-admin'] } },
    { method: 'PUT',  path: '/admin/users/:id/role',  handler: 'admin.changeRole',
      config: { policies: ['global::is-admin'] } },
    { method: 'GET',  path: '/admin/stats',           handler: 'admin.stats',
      config: { policies: ['global::is-admin'] } },
  ],
};
```

### 3.2 Controller
`src/api/admin/controllers/admin.ts`:
```ts
import { ROLE } from '../../../constants/roles';

export default {
  // GET /api/admin/users
  async listUsers(ctx) {
    const users = await strapi.query('plugin::users-permissions.user').findMany({
      populate: { role: true },
    });
    ctx.body = {
      data: users.map((u) => ({
        id: u.id, username: u.username, email: u.email,
        role: u.role ? { id: u.role.id, name: u.role.name } : null,
      })),
    };
  },

  // PUT /api/admin/users/:id/role   { role: "Instructor" }  (role by name or id)
  async changeRole(ctx) {
    const targetId = Number(ctx.params.id);
    const roleName = ctx.request.body?.role;
    if (!roleName) return ctx.badRequest('role is required');

    const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { name: roleName } });
    if (!role) return ctx.badRequest('Unknown role');

    // Guardrail: don't allow removing the last Admin (avoid lockout).
    const target = await strapi.query('plugin::users-permissions.user').findOne({ where: { id: targetId }, populate: { role: true } });
    if (target?.role?.name === ROLE.ADMIN && roleName !== ROLE.ADMIN) {
      const adminRole = await strapi.query('plugin::users-permissions.role').findOne({ where: { name: ROLE.ADMIN } });
      const adminCount = await strapi.query('plugin::users-permissions.user').count({ where: { role: adminRole.id } });
      if (adminCount <= 1) return ctx.badRequest('Cannot demote the last remaining Admin');
    }

    const updated = await strapi.query('plugin::users-permissions.user').update({
      where: { id: targetId }, data: { role: role.id }, populate: { role: true },
    });
    ctx.body = { data: { id: updated.id, username: updated.username, role: { id: updated.role.id, name: updated.role.name } } };
  },

  // GET /api/admin/stats
  async stats(ctx) {
    const roles = await strapi.query('plugin::users-permissions.role').findMany();
    const usersByRole = {};
    for (const r of roles) {
      usersByRole[r.name] = await strapi.query('plugin::users-permissions.user').count({ where: { role: r.id } });
    }
    const totalUsers = Object.values(usersByRole).reduce((a: number, b: number) => a + b, 0);
    const totalCourses = await strapi.documents('api::course.course').count({});
    const totalEnrollments = await strapi.documents('api::enrollment.enrollment').count({});
    const totalBlogPosts = await strapi.documents('api::blog-post.blog-post').count({});

    ctx.body = { data: { totalUsers, usersByRole, totalCourses, totalEnrollments, totalBlogPosts } };
  },
};
```

> **Why role change goes through a dedicated endpoint:** never let a client change roles via the generic user-update route. Expose exactly one admin-only, policy-guarded action for it, with the last-admin guardrail.

### 3.3 Admin manages all content
No new endpoints needed — Admin already satisfies `can-manage-course`, `can-manage-lesson`, `can-manage-quiz`, and `can-manage-blog` for **any** record (those policies allow Admin unconditionally). The admin UI simply lists all courses/lessons/blog posts and calls the same CRUD Server Actions.

---

## 4. Frontend (`features/admin/`)

Admin dashboard under `/admin`:

### 4.1 Overview page `/admin`
- **Stats cards** from `/api/admin/stats`: total users, users per role (small breakdown), total courses, total enrollments, total blog posts.

### 4.2 Users page `/admin/users`
- Table of all users (`/api/admin/users`): username, email, current role, and a **role selector** (dropdown of the 4 roles).
- Changing the dropdown calls a Server Action `changeUserRole(userId, roleName)` → `PUT /api/admin/users/:id/role`. Show success/error; re-fetch the table.
- Surface the "last Admin" guardrail error cleanly.

### 4.3 Courses page `/admin/courses`
- All courses with edit/delete (reuses course Server Actions). Admin can edit/delete any.

### 4.4 Blog page `/admin/blog`
- All blog posts (drafts + published) with edit/delete/publish (Plan 06). Admin has full control over every post, including others'.

> UI is role-aware for convenience; the backend `is-admin` / ownership policies are the real enforcement.

---

## 5. Edge cases
| Case | Expected |
|---|---|
| Non-admin hits any `/api/admin/*` | `403` (policy), regardless of hidden UI. |
| Admin demotes the last Admin | `400` — blocked (lockout guard). |
| Change role to a non-existent role name | `400`. |
| Promote a Student → Instructor, then that user creates a course | New course is owned by them; they can manage it (verifies role change took effect end-to-end). |
| Stats when platform is empty | All zeros, no crash. |
| Admin edits another user's blog draft | Allowed (`can-manage-blog` passes for Admin). |

---

## 6. Acceptance criteria / definition of done
- [ ] `/admin` reachable only by Admin (front redirect + back `is-admin`).
- [ ] `GET /api/admin/users` lists all users with roles.
- [ ] `PUT /api/admin/users/:id/role` changes roles, with last-Admin guardrail.
- [ ] `GET /api/admin/stats` returns users-per-role, total courses, total enrollments.
- [ ] Admin can view/manage all courses, lessons, blog posts.
- [ ] All §5 edge cases handled.

---

## 7. Video talking points (admin)
1. **Access:** show a non-admin JWT getting `403` on `/api/admin/users` even though the page is hidden — this is the "backend, not buttons" proof for the admin area.
2. **Role management live:** promote a Student to Instructor in the UI, then log in as that user and create a course.
3. **Stats:** show the stats endpoint aggregating counts (users-per-role loop, course/enrollment counts).
