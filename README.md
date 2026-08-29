# LMS (Learning Managment System)

This LMS is a role-aware learning management system for creating courses, enrolling students, tracking lesson progress, grading quizzes, and publishing learning content.

## Tech stack

- Frontend: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS; deployed to Vercel.
- Backend: Strapi 5, TypeScript, SQLite for development, PostgreSQL for production; deployed to Railway.
- Runtime: Node.js 20 LTS.

## Repository layout

```text
.
├── frontend/   # Next.js application (Vercel root directory)
├── backend/    # Strapi application (Railway root directory)
└── README.md
```

The frontend is feature-first: route files stay in `src/app`, domain code lives in `src/features`, and shared server utilities live in `src/lib`. The backend keeps each domain in its own `src/api` directory and reserves `src/policies` for reusable, backend-enforced authorization.

## Run locally

Install Node.js 20 (the version is recorded in `.nvmrc`), then configure and start each app in a separate terminal.

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run develop
```

The Strapi API and CMS run at `http://localhost:1337`. Local development uses SQLite at `backend/.tmp/data.db` by default. Replace every `change-me` secret in `.env`; do not commit that file.

Important backend variables:

| Variable | Local value | Production value |
|---|---|---|
| `DATABASE_CLIENT` | `sqlite` | `postgres` |
| `DATABASE_FILENAME` | `.tmp/data.db` | not used |
| `DATABASE_URL` | not used | Railway PostgreSQL URL |
| `DATABASE_SSL` | `false` | `true` |
| `FRONTEND_URL` | `http://localhost:3000` | Vercel app URL |
| `APP_KEYS`, token salts, JWT secrets, `ENCRYPTION_KEY` | unique secrets | unique secrets |

Generate production secrets with `openssl rand -base64 32`.

### Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The web app runs at `http://localhost:3000`.

| Variable | Purpose |
|---|---|
| `STRAPI_URL` | Server-only Strapi base URL used for API and authenticated calls |
| `NEXT_PUBLIC_STRAPI_URL` | Public Strapi base URL used only for media URLs |

Authentication calls run through Next.js Server Actions. The Strapi JWT is stored in the `lms_jwt` httpOnly cookie and is attached to API requests only on the server. Frontend route guards improve the user experience; Strapi policies are the authoritative authorization layer.

## Demo accounts

The backend bootstrap idempotently seeds these review accounts. All use the password `Passw0rd!`. Public registration always assigns the Student role; only an Admin can change a user's role.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@lms.test` | `Passw0rd!` |
| Content Manager | `manager@lms.test` | `Passw0rd!` |
| Instructor | `instructor@lms.test` | `Passw0rd!` |
| Student | `student@lms.test` | `Passw0rd!` |

The same bootstrap adds three demo courses with ordered lessons. The demo Student is enrolled in **Web Development Foundations**, so its lesson viewer is ready immediately after login. Existing seeded records are preserved on later restarts.

## Completed features

- [x] Next.js 15 and Strapi 5 monorepo scaffold
- [x] Node.js 20 and exact framework versions pinned
- [x] Environment-driven SQLite/PostgreSQL backend configuration
- [x] Localhost/Vercel CORS configuration
- [x] Feature-first frontend and domain-based backend module layout
- [x] Server-only typed Strapi fetch wrapper
- [x] httpOnly-cookie login/register session foundation
- [x] Middleware authentication checks and role-gated dashboard layouts
- [x] Four-role seeding, Student-default registration, and demo accounts
- [x] Authoritative role, ownership, enrollment, lesson, and quiz policies (Plan 02)
- [x] Course and ordered lesson CRUD with server-owned courses (Plan 02)
- [x] Student enrollment, duplicate protection, My Courses, and gated lesson viewer (Plan 02)
- [ ] Progress tracking (Plan 03)
- [ ] Quiz auto-grading and stored attempts (Plan 04)
- [ ] Admin panel and platform statistics (Plan 05)
- [ ] Blog draft/publish workflow (Plan 06)

## Deployment

### Railway

Deploy the repository with `backend` as the service root, attach PostgreSQL, and use `npm run build` / `npm run start`. Configure `NODE_ENV=production`, `HOST=0.0.0.0`, `DATABASE_CLIENT=postgres`, `DATABASE_URL`, `DATABASE_SSL=true`, `FRONTEND_URL`, and all secrets listed in `backend/.env.example`.

### Vercel

Import the same repository with `frontend` as the root directory, select Node.js 20, and set `STRAPI_URL` plus `NEXT_PUBLIC_STRAPI_URL` to the public Railway backend URL. After Vercel is live, set Railway's `FRONTEND_URL` to the Vercel domain and redeploy the backend.

## Live links

- Frontend (Vercel): Not deployed yet
- Backend (Railway): Not deployed yet

## Verification

```bash
cd backend && npm run typecheck && npm run build
cd frontend && npm run lint && npm run typecheck && npm run build
```

With the backend running, execute the direct-API authorization matrix from `02-core-features-and-rbac.md`:

```bash
cd backend
npm run verify:rbac
```

The verifier checks all 10 required rows plus demo-role/default-role seeding, lesson ownership, lesson CRUD, and ascending lesson order.
