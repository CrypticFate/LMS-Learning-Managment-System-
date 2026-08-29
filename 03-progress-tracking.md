# Plan 03 — Differentiator 1: Progress Tracking

> **Scope:** Let a student mark a lesson "complete", show an accurate **per-student, per-course** progress percentage that **persists across refreshes**, and let instructors/CM/Admin view student progress for courses in their scope. Builds on `Lesson`, `Enrollment`, and the policies from **Plan 02**.
>
> **What the reviewers said:** *"This progress must be accurate per student, per course — and must persist across refreshes."* Accuracy + persistence + no cross-user leakage are the bar.

---

## 1. Design decision (state this in the video)

Store **one record per (student, lesson) completion** rather than a single mutable "percent" field. Percentage is **computed on read** as `completedLessons / totalLessonsInCourse`.

**Why this model:**
- **Persistence** is automatic — completion lives in the DB, so a refresh just re-reads it.
- **Accuracy** — the denominator is always the course's *current* lesson count, so adding a lesson correctly drops the percentage (no stale cached percent to fix).
- **Auditability** — you know exactly which lessons are done and when.
- **No leaks** — each record is tied to a `student`; queries always filter by the authenticated student.

---

## 2. Data model

### `LessonCompletion` — `api::progress.progress` (folder `progress`, content-type `progress`)
| Field | Type | Notes |
|---|---|---|
| `student` | relation: manyToOne → User | who completed |
| `lesson` | relation: manyToOne → Lesson | which lesson |
| `course` | relation: manyToOne → Course | **denormalized** for fast per-course counts |
| `completedAt` | datetime | set on create |

`"draftAndPublish": false`.

**Uniqueness (critical):** exactly one completion per (student, lesson). Strapi can't enforce a composite unique across relations, so enforce in the controller: before create, look up an existing record; if found, treat mark-complete as **idempotent** (return the existing one, `200`) instead of creating a duplicate. This keeps the numerator correct.

> Denormalizing `course` avoids having to join through `lesson.course` on every progress read. Keep it consistent: set `course` from `lesson.course` server-side, never from the client.

---

## 3. Endpoints

| Method | Path | Who | Enforcement |
|---|---|---|---|
| POST | `/api/progress/complete` | enrolled Student | `is-enrolled` (course resolved from the lesson) + student set server-side |
| DELETE | `/api/progress/complete/:lessonDocumentId` | enrolled Student | own record only |
| GET | `/api/progress/course/:courseDocumentId` | enrolled Student | own progress in that course |
| GET | `/api/progress/me` | Student | summary across all enrolled courses |
| GET | `/api/courses/:courseDocumentId/progress` | Admin/CM any; Instructor own course | `can-view-course-progress` |

Body for mark-complete: `{ "data": { "lesson": "<lessonDocumentId>" } }`. The course is derived from the lesson server-side (do **not** trust a client-sent course).

---

## 4. Backend implementation

### 4.1 `is-enrolled` for the lesson case
The mark-complete route needs enrollment checked against the lesson's course. Extend `is-enrolled` (Plan 02) to resolve the course from a lesson when the body carries `lesson` instead of `course`:
```ts
// inside is-enrolled.ts, when resolving courseDocId:
let courseDocId =
  policyContext.params?.courseDocumentId ??
  policyContext.request.body?.data?.course;

const lessonDocId = policyContext.request.body?.data?.lesson;
if (!courseDocId && lessonDocId) {
  const lesson = await strapi.documents('api::lesson.lesson').findOne({
    documentId: lessonDocId, populate: { course: true },
  });
  courseDocId = lesson?.course?.documentId;
}
// ...then check enrollment as before
```

### 4.2 Progress controller — `src/api/progress/controllers/progress.ts`
```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  // POST /api/progress/complete  { data: { lesson } }  — idempotent
  async complete(ctx) {
    const user = ctx.state.user;
    const lessonDocId = ctx.request.body?.data?.lesson;
    if (!lessonDocId) return ctx.badRequest('lesson is required');

    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonDocId, populate: { course: true },
    });
    if (!lesson) return ctx.notFound('Lesson not found');

    const [existing] = await strapi.documents('api::progress.progress').findMany({
      filters: { student: user.id, lesson: { documentId: lessonDocId } }, limit: 1,
    });
    if (existing) return { data: existing };                      // idempotent 200

    const created = await strapi.documents('api::progress.progress').create({
      data: {
        student: user.id,
        lesson: lessonDocId,
        course: lesson.course.documentId,                          // denormalized server-side
        completedAt: new Date(),
      },
    });
    return { data: created };
  },

  // DELETE /api/progress/complete/:lessonDocumentId  — un-mark, own record only
  async uncomplete(ctx) {
    const user = ctx.state.user;
    const lessonDocId = ctx.params.lessonDocumentId;
    const [rec] = await strapi.documents('api::progress.progress').findMany({
      filters: { student: user.id, lesson: { documentId: lessonDocId } }, limit: 1,
    });
    if (!rec) return ctx.notFound();
    await strapi.documents('api::progress.progress').delete({ documentId: rec.documentId });
    return { data: { ok: true } };
  },

  // GET /api/progress/course/:courseDocumentId  — the student's own progress in one course
  async courseProgress(ctx) {
    const user = ctx.state.user;
    const courseDocId = ctx.params.courseDocumentId;
    return computeCourseProgress(strapi, user.id, courseDocId);
  },

  // GET /api/progress/me  — summary across enrolled courses
  async me(ctx) {
    const user = ctx.state.user;
    const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: { student: user.id }, populate: { course: true },
    });
    const out = [];
    for (const e of enrollments) {
      out.push(await computeCourseProgress(strapi, user.id, e.course.documentId));
    }
    return { data: out };
  },
}));

// ---- shared calculation (the graded logic) ----
async function computeCourseProgress(strapi, studentId: number, courseDocId: string) {
  const totalLessons = await strapi.documents('api::lesson.lesson').count({
    filters: { course: { documentId: courseDocId } },
  });
  const completed = await strapi.documents('api::progress.progress').count({
    filters: { student: studentId, course: { documentId: courseDocId } },
  });
  const percent = totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);
  return { data: { courseDocumentId: courseDocId, completed, totalLessons, percent } };
}
```

### 4.3 Instructor/CM/Admin view — `can-view-course-progress`
`src/policies/can-view-course-progress.ts`:
```ts
import { ROLE } from '../constants/roles';
export default async (policyContext, _config, { strapi }) => {
  const user = policyContext.state.user;
  const role = user?.role?.name;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true;   // any course
  if (role !== ROLE.INSTRUCTOR) return false;
  const course = await strapi.documents('api::course.course').findOne({
    documentId: policyContext.params.courseDocumentId, populate: { owner: true },
  });
  return course?.owner?.id === user.id;                                    // own course
};
```
Controller `courseStudents` (route `GET /api/courses/:courseDocumentId/progress`): list enrollments for the course and, for each student, run `computeCourseProgress`. Return `[{ student: {id, username, email}, percent, completed, totalLessons }]`.

### 4.4 Routes
Add a custom routes file `src/api/progress/routes/custom.ts` (authenticated). Attach `is-enrolled` to `complete`/`uncomplete`, `has-any-role({Student})` to `courseProgress`/`me`, and `can-view-course-progress` to the manager view (register that route under the course API or progress API).

---

## 5. Frontend

### 5.1 Student — lesson viewer with progress (`features/progress/`)
- On the course viewer page (`/student/courses/[documentId]`), a **Server Component** fetches:
  - lessons (`/api/courses/:id/lessons`, ordered),
  - progress (`/api/progress/course/:id`) → `{ completed, totalLessons, percent }`,
  - the set of completed lesson ids.
- Render a **progress bar** (e.g. "3 of 5 lessons · 60%") and a per-lesson **Mark complete / Completed** toggle.
- The toggle calls a Server Action `markComplete(lessonDocumentId)` / `unmarkComplete(...)` (attaches JWT). After the action, `revalidatePath` the course page so the bar updates. **Because state is in the DB, a hard refresh shows the same progress** — demonstrate this in the video.

### 5.2 "My Courses" progress
- `/student/my-courses` shows each enrolled course with its percentage (from `/api/progress/me`). One card per course with a mini progress bar.

### 5.3 Instructor/CM/Admin — student progress view
- On a course's management page, a "Student progress" tab lists enrolled students with their `percent` (from `/api/courses/:id/progress`). Instructor only sees this for **their own** courses (enforced by policy, not just UI).

---

## 6. Edge cases (handle explicitly)
| Case | Expected behavior |
|---|---|
| Mark same lesson twice | Idempotent — no duplicate record; percent unchanged. |
| New lesson added to course after student completed some | Denominator grows → percent **drops** correctly on next read (no stale percent). |
| Un-mark a completed lesson | Record deleted; percent recomputes down. |
| Course has 0 lessons | percent = 0 (guard against divide-by-zero). |
| Non-enrolled user calls `/progress/complete` | 403 via `is-enrolled`. |
| Student A tries to read Student B's progress | Impossible — queries always filter by `ctx.state.user.id`; there is no endpoint that takes another student id for a student caller. |
| Lesson deleted after completion | Orphan completion; either cascade-delete completions on lesson delete (preferred — do it in the lesson controller's `delete`) or filter them out. Choose cascade and mention it. |
| Client sends a `course` in the body that doesn't match the lesson | Ignored — course is derived from the lesson server-side. |

---

## 7. Acceptance criteria / definition of done
- [ ] `progress` content-type with `student`, `lesson`, `course`, `completedAt`.
- [ ] Mark-complete is **idempotent** (unique per student+lesson enforced in controller).
- [ ] Percentage is computed as `completed / currentTotalLessons`, rounded, 0-safe.
- [ ] Progress **persists across refresh** (verified live).
- [ ] Un-mark works and recomputes.
- [ ] Student can only ever see/modify **their own** progress.
- [ ] Instructor sees progress for **own** courses only; CM/Admin for any (policy-enforced).
- [ ] All edge cases in §6 handled.

---

## 8. Video talking points (progress — reviewers want this line-by-line)
1. **Model choice:** completion records, not a stored percent — explain persistence + accuracy.
2. **Where data is stored:** the `progress` table, one row per completed lesson, keyed to the student.
3. **The calculation:** walk `computeCourseProgress` line by line — count total lessons, count this student's completions, divide, round, guard zero.
4. **Persistence proof:** mark a lesson, hard-refresh, show it's still complete (it re-reads from DB).
5. **No-leak proof:** show the query always filters by `ctx.state.user.id`.
