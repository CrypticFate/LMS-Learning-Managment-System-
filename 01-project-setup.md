# Plan 01 — Project Setup & Modular Architecture

> **Scope of this file:** Repository layout, tech stack + pinned versions, Strapi backend bootstrap, Next.js frontend bootstrap, the shared auth architecture, the API client, coding conventions, Git strategy, deployment (Railway + Vercel), and the README. Every later plan (02–06) assumes the structure defined here.

---

## 1. Non-negotiable tech stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | **Next.js (App Router, TypeScript)** | **Vercel** |
| Backend / CMS | **Strapi 5** | **Railway** |
| DB (dev) | SQLite | local |
| DB (prod) | PostgreSQL | Railway plugin |

**Do not deviate.** Any other framework/hosting makes the submission void.

### Pinned versions (use these unless a newer patch is required)
- Node.js **20 LTS** (Strapi 5 supports 18/20/22; 20 is the safe target — set in `.nvmrc` and in Railway/Vercel).
- Strapi **5.x** latest (`npx create-strapi@latest`). Pin the exact version in `backend/package.json` after install.
- Next.js **15.x** (`npx create-next-app@latest`), React 18/19, TypeScript, Tailwind CSS.

> ⚠️ **Strapi 4 vs 5 matters.** This project targets **Strapi 5**. Section 4.5 lists the v5-specific rules the agent must follow (Document Service API, `documentId`, flattened responses). Do **not** mix Strapi 4 patterns (Entity Service, `data.attributes` nesting) into the code.

---

## 2. Repository layout (monorepo, single public repo)

The submission requires **one** GitHub repo containing **both** frontend and backend. Use a monorepo with two top-level folders:

```
lms/                        # repo root
├── frontend/               # Next.js app  -> deploys to Vercel (root dir = frontend)
├── backend/                # Strapi app   -> deploys to Railway (root dir = backend)
├── .gitignore
├── .nvmrc                  # "20"
└── README.md               # run instructions + completed-features list (required)
```

- Vercel "Root Directory" = `frontend`.
- Railway "Root Directory" = `backend`.
- Keep **one** `README.md` at the repo root (plus optional per-folder notes).

---

## 3. Backend — Strapi 5 setup

### 3.1 Create the app
```bash
cd lms
npx create-strapi@latest backend --typescript --no-run
cd backend
# choose "Skip" for the cloud login prompt if shown
```
Use SQLite for local dev (default). Postgres is configured via env for production (Section 8).

### 3.2 Database config (must be env-driven)
`backend/config/database.ts` — support SQLite locally and Postgres in prod via a single switch:
```ts
import path from 'path';

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite');

  const connections = {
    sqlite: {
      connection: {
        filename: path.join(__dirname, '..', '..', env('DATABASE_FILENAME', '.tmp/data.db')),
      },
      useNullAsDefault: true,
    },
    postgres: {
      connection: env('DATABASE_URL')
        ? { connectionString: env('DATABASE_URL'), ssl: env.bool('DATABASE_SSL', false) }
        : {
            host: env('DATABASE_HOST', 'localhost'),
            port: env.int('DATABASE_PORT', 5432),
            database: env('DATABASE_NAME', 'strapi'),
            user: env('DATABASE_USERNAME', 'strapi'),
            password: env('DATABASE_PASSWORD', ''),
            ssl: env.bool('DATABASE_SSL', false) ? { rejectUnauthorized: false } : false,
          },
      pool: { min: 0, max: 10 },
    },
  };

  return { connection: { client, ...connections[client] } };
};
```
Install the pg driver: `npm i pg`.

### 3.3 CORS — allow the Vercel frontend
`backend/config/middlewares.ts` — configure the `strapi::cors` middleware:
```ts
export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:3000',
        process.env.FRONTEND_URL, // e.g. https://your-app.vercel.app
      ].filter(Boolean),
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Content-Type', 'Authorization'],
      credentials: true,
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

### 3.4 Backend modular structure

Strapi is already modular per content-type. Keep **one API folder per domain**, and put cross-cutting authorization in **global policies** (single source of truth — see Plan 02).

```
backend/
├── config/
│   ├── database.ts
│   ├── middlewares.ts
│   ├── server.ts
│   └── plugins.ts
└── src/
    ├── index.ts                     # bootstrap: seed roles + default role + seed admin (Plan 02)
    ├── constants/
    │   └── roles.ts                 # ROLE = { ADMIN:'Admin', CONTENT_MANAGER:'Content Manager', ... }
    ├── policies/                    # GLOBAL, reusable — authoritative authorization layer
    │   ├── has-any-role.ts          # -> global::has-any-role
    │   ├── is-admin.ts              # -> global::is-admin
    │   ├── can-manage-course.ts     # Admin/CM any; Instructor own
    │   ├── is-enrolled.ts           # student must be enrolled in the target course
    │   ├── can-view-course-progress.ts
    │   └── can-manage-blog.ts       # Admin any; CM own
    ├── extensions/
    │   └── users-permissions/       # extend /me, register, etc. if needed
    └── api/
        ├── course/                  # schema, controller, routes, service
        ├── lesson/
        ├── enrollment/
        ├── progress/                # lesson-completion records (Plan 03)
        ├── quiz/                    # + questions component (Plan 04)
        ├── quiz-attempt/            # stored quiz results (Plan 04)
        └── blog-post/               # (Plan 06)
```

> **Rule:** Any endpoint that must respect a role or ownership gets a **policy** in `src/policies/`. Controllers only run after the policy passes. This is the "no leaks" layer the evaluators are grading (see Plan 02, §RBAC).

---

## 4. Frontend — Next.js 15 setup

### 4.1 Create the app
```bash
cd lms
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### 4.2 Frontend modular structure (feature-first)

```
frontend/
├── middleware.ts                    # route protection (auth presence + expiry)
└── src/
    ├── app/                         # routes only (thin — delegate to features/)
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   └── register/page.tsx
    │   ├── (public)/
    │   │   ├── page.tsx              # landing / catalog
    │   │   ├── courses/page.tsx
    │   │   ├── courses/[documentId]/page.tsx
    │   │   ├── blog/page.tsx
    │   │   └── blog/[slug]/page.tsx
    │   └── (dashboard)/
    │       ├── layout.tsx            # requires auth
    │       ├── student/...           # (Plans 02–04)
    │       ├── instructor/...        # (Plans 02–04)
    │       ├── content-manager/...   # (Plans 02, 06)
    │       └── admin/                # (Plan 05) — layout enforces role === Admin
    ├── features/                     # the real code lives here, one module per domain
    │   ├── auth/         { components/  actions.ts  session.ts  types.ts }
    │   ├── courses/      { components/  actions.ts  api.ts  types.ts }
    │   ├── lessons/
    │   ├── enrollment/
    │   ├── progress/     (Plan 03)
    │   ├── quiz/         (Plan 04)
    │   ├── blog/         (Plan 06)
    │   └── admin/        (Plan 05)
    ├── components/ui/                # shared, dumb UI (Button, Card, Table, Badge…)
    ├── lib/
    │   ├── strapi.ts                 # server-side fetch wrapper (§5)
    │   ├── constants.ts              # ROLE names, route maps
    │   └── utils.ts
    └── types/                        # shared cross-feature types
```

**Convention:** `app/` files stay thin (routing + layout). Business UI, data calls, and Server Actions live under `features/<domain>/`. Shared primitives under `components/ui/`.

### 4.3 Auth architecture (shared by every feature — read carefully)

The evaluators explicitly want backend-enforced permissions, *not* button-hiding. Frontend auth here is **defense-in-depth + UX**; the backend policies (Plan 02) are the real gate.

**Design:**
1. **Token storage:** Strapi's JWT is stored in an **httpOnly cookie** (`lms_jwt`). The browser JS never reads the token → no XSS token theft.
2. **Login / Register:** implemented as **Server Actions** (`features/auth/actions.ts`). They call Strapi's `/api/auth/local` (or `/register`), then set the httpOnly cookie via `cookies()`.
3. **Reads:** **Server Components** call Strapi through `lib/strapi.ts`, which reads the cookie server-side and attaches `Authorization: Bearer`.
4. **Writes:** **Server Actions** per feature read the cookie and call Strapi. The token stays server-side end-to-end.
5. **Middleware** (`middleware.ts`): redirect unauthenticated users away from `(dashboard)` routes by checking cookie presence/expiry (decode-only, not trusted).
6. **Role gating (UX):** each dashboard sub-layout is a Server Component that calls `getCurrentUser()` and redirects if the role is wrong (e.g. `admin/layout.tsx` requires `Admin`). This is cosmetic — the backend still enforces.

> This gives one clean video story: *"The JWT lives in an httpOnly cookie; my server actions attach it to Strapi calls; the browser never holds the token; and every Strapi route runs a policy that checks role + ownership before the controller."*

### 4.4 Session helper — `features/auth/session.ts`
```ts
import { cookies } from 'next/headers';
import { strapiFetch } from '@/lib/strapi';

export type CurrentUser = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  role: { id: number; name: string; type: string };
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jwt = (await cookies()).get('lms_jwt')?.value;
  if (!jwt) return null;
  try {
    return await strapiFetch<CurrentUser>('/api/users/me?populate=role', { auth: true });
  } catch {
    return null;
  }
}
```

### 4.5 Strapi 5 rules the frontend + backend must follow
- REST list: `GET /api/<plural>` → `{ data: [...], meta }`. Each item has `id`, **`documentId`**, and fields **flattened at top level** (no `attributes` wrapper).
- Single/update/delete by **`documentId`**: `GET|PUT|DELETE /api/<plural>/:documentId`.
- Create/update bodies use `{ data: {...} }`.
- Populate relations: `?populate=field` or `?populate=*` (first level).
- Filters: `?filters[field][$eq]=value`.
- In custom backend code, use the **Document Service**: `strapi.documents('api::course.course').findMany({...}) / .findOne({ documentId }) / .create({ data }) / .update({ documentId, data }) / .delete({ documentId })`. **Do not** use the old Entity Service.

---

## 5. API client — `frontend/src/lib/strapi.ts`

A single typed fetch wrapper used by Server Components and Server Actions. It never runs on the client.

```ts
import 'server-only';
import { cookies } from 'next/headers';

const BASE = process.env.STRAPI_URL ?? 'http://localhost:1337';

type Opts = RequestInit & { auth?: boolean };

export async function strapiFetch<T>(path: string, opts: Opts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  headers.set('Content-Type', 'application/json');

  if (opts.auth) {
    const jwt = (await cookies()).get('lms_jwt')?.value;
    if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, cache: 'no-store' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Strapi ${res.status} on ${path}: ${body}`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}
```

- `STRAPI_URL` = server-side backend URL (Railway).
- `NEXT_PUBLIC_STRAPI_URL` = only for building **media/image** URLs on the client (Strapi upload URLs). Never for auth calls.

---

## 6. Shared constants — `frontend/src/lib/constants.ts` & `backend/src/constants/roles.ts`

Single source of truth for role names (used in policies and UI). **Both apps must agree on the exact strings.**
```ts
export const ROLE = {
  ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
} as const;
export type RoleName = (typeof ROLE)[keyof typeof ROLE];
```
Policies check `user.role.name` against these constants (Plan 02 seeds roles with exactly these names).

---

## 7. Coding conventions
- **TypeScript everywhere**, `strict: true`. No `any` in committed code.
- Naming: `PascalCase` components, `camelCase` functions/vars, `kebab-case` files in `features/*`, content-type folders singular (`course`, not `courses`).
- Every Server Action returns a typed result `{ ok: true, data } | { ok: false, error }` — never throw raw to the client.
- Error handling: backend policies return `false`/`ctx.forbidden(...)`; controllers wrap logic in try/catch and return proper status codes (`400/401/403/404/409`).
- No secrets in the repo. All secrets via env (Sections 3 & 8).

---

## 8. Deployment

### 8.1 Railway (Strapi backend)
1. New project → Deploy from GitHub repo → set **Root Directory = `backend`**.
2. Add the **PostgreSQL** plugin. Railway exposes `DATABASE_URL` (and PG* vars).
3. Set **Variables** on the backend service:

| Variable | Value / note |
|---|---|
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | provided by Railway (don't hardcode) |
| `DATABASE_CLIENT` | `postgres` |
| `DATABASE_URL` | from Railway Postgres |
| `DATABASE_SSL` | `true` (Railway PG usually needs SSL) |
| `APP_KEYS` | 4 random comma-separated keys |
| `API_TOKEN_SALT` | random |
| `ADMIN_JWT_SECRET` | random |
| `TRANSFER_TOKEN_SALT` | random |
| `JWT_SECRET` | random (users-permissions) |
| `ENCRYPTION_KEY` | random (Strapi 5) |
| `FRONTEND_URL` | the Vercel URL (for CORS) |

Generate secrets with `openssl rand -base64 32`. Build command: `npm run build`; start: `npm run start`.

4. After first deploy, open `https://<railway-domain>/admin` and create the **first Strapi admin** (this is the CMS admin, separate from app users). Then the app-role seeding from Plan 02 runs on bootstrap.

### 8.2 Vercel (Next.js frontend)
1. Import the repo → set **Root Directory = `frontend`**.
2. Variables:

| Variable | Value |
|---|---|
| `STRAPI_URL` | `https://<railway-domain>` (server-side) |
| `NEXT_PUBLIC_STRAPI_URL` | `https://<railway-domain>` (media URLs) |
| `NODE_ENV` | `production` |

3. After both are live, set Railway's `FRONTEND_URL` to the Vercel domain and redeploy backend so CORS allows it.

### 8.3 Keep it live
The deployed app **must stay up until interviews finish**. Do not pause the Railway service or delete the DB.

> **Video talking point (deployment):** show Vercel root dir, Railway root dir + Postgres plugin, and how env vars (esp. `STRAPI_URL`, DB URL, JWT secrets, CORS `FRONTEND_URL`) are wired between the two.

---

## 9. Git strategy (this is explicitly graded)
- **Never** push the whole project in one commit — that's a negative signal.
- Commit in small, meaningful units mapped to the plan steps. Suggested checkpoints:
  1. `chore: scaffold monorepo (frontend + backend)`
  2. `feat(backend): db config, cors, role constants`
  3. `feat(backend): seed roles + default role + admin (bootstrap)`
  4. `feat(auth): login/register server actions + httpOnly cookie`
  5. `feat(courses): schema + CRUD + ownership policy`
  6. … one commit per feature slice (Plans 03–06 each = several commits).
- Use conventional prefixes (`feat`, `fix`, `chore`, `refactor`, `docs`).
- `.gitignore` must exclude: `node_modules/`, `.env`, `frontend/.next/`, `backend/.tmp/`, `backend/build/`, `backend/.strapi/`, `*.db`.

---

## 10. README (required at repo root)
Must briefly contain:
1. **What it is** — one line.
2. **Tech stack** — Next.js + Strapi 5, Vercel + Railway.
3. **Run locally** — backend (`cd backend && npm i && npm run develop`) and frontend (`cd frontend && npm i && npm run dev`), plus the `.env` variables each needs.
4. **Seeded accounts** — the demo admin/instructor/CM/student credentials (from Plan 02 seed) so reviewers can log in.
5. **Completed features** — checklist of what's done (core + which differentiators).
6. **Live links** — Vercel + Railway URLs.

---

## 11. Definition of done (this plan)
- [ ] Monorepo with `frontend/` + `backend/`, single `.gitignore`, `.nvmrc`.
- [ ] Strapi 5 runs locally on SQLite; env-driven Postgres config present.
- [ ] CORS allows localhost + `FRONTEND_URL`.
- [ ] Modular folders created on both sides (empty stubs ok).
- [ ] `strapi.ts` fetch wrapper + `session.ts` + role constants in place.
- [ ] Both apps deploy (Railway + Vercel) and can reach each other.
- [ ] README skeleton + first real commits pushed (not one dump).

**Proceed to Plan 02 (Core features & RBAC) next — it defines the roles, auth, and the authorization policies everything else depends on.**
