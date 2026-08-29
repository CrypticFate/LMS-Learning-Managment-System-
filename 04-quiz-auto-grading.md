# Plan 04 — Differentiator 2: Quiz with Auto-Grading

> **Scope:** An instructor/CM adds an MCQ quiz (question + options + correct answer) to a course. A student takes it and gets an **automatic score immediately on submit**; the result is **stored and viewable later**. Builds on `Course`, `Enrollment`, and Plan 02 policies.
>
> **The differentiator done right = security.** Correct answers must **never reach the student's browser**, and grading must happen **server-side**. If the answer key is in the client payload, a candidate has failed the "handle edge cases" bar. This plan makes server-side grading the centerpiece.

---

## 1. Data model

### 1.1 `Quiz` — `api::quiz.quiz`
| Field | Type | Notes |
|---|---|---|
| `title` | string, required | |
| `course` | relation: manyToOne → Course | ownership anchor (via `course.owner`) |
| `questions` | component (repeatable) `quiz.question` | the MCQs |
| `attempts` | relation: oneToMany → QuizAttempt | stored results |

`"draftAndPublish": false`.

### 1.2 Component `quiz.question` (category `quiz`, name `question`)
| Field | Type | Notes |
|---|---|---|
| `questionText` | string, required | |
| `options` | JSON | array of strings, e.g. `["A","B","C","D"]` (2–6 options) |
| `correctIndex` | integer, required | 0-based index of the correct option — **the secret** |

> Using `options` as a JSON array + `correctIndex` integer keeps grading trivial and unambiguous. The `correctIndex` is the sensitive field that must be stripped for students.

### 1.3 `QuizAttempt` — `api::quiz-attempt.quiz-attempt`
| Field | Type | Notes |
|---|---|---|
| `student` | relation: manyToOne → User | |
| `quiz` | relation: manyToOne → Quiz | |
| `course` | relation: manyToOne → Course | denormalized |
| `answers` | JSON | student's chosen indices, e.g. `[2,0,1,3]` |
| `score` | integer | number correct |
| `total` | integer | number of questions at submit time |
| `submittedAt` | datetime | |

`"draftAndPublish": false`.

---

## 2. Endpoints

| Method | Path | Who | Enforcement |
|---|---|---|---|
| POST | `/api/quizzes` | Admin/CM any; Instructor own course | `can-manage-course` (course from `body.data.course`) |
| PUT | `/api/quizzes/:documentId` | Admin/CM any; Instructor own | `can-manage-quiz` |
| DELETE | `/api/quizzes/:documentId` | Admin/CM any; Instructor own | `can-manage-quiz` |
| GET | `/api/quizzes/:documentId` | managers of the course | `can-manage-quiz` — **full quiz incl. correctIndex** |
| GET | `/api/quizzes/:documentId/take` | enrolled Student | `is-enrolled` — **sanitized (no correctIndex)** |
| POST | `/api/quizzes/:documentId/submit` | enrolled Student | `is-enrolled` — **server grades** |
| GET | `/api/quiz-attempts/me` | Student | own attempts only |
| GET | `/api/quizzes/:documentId/attempts` | managers of the course | `can-manage-quiz` — all students' results |

> Two distinct GETs for a quiz: the **manager** view (full, with answers) and the **student `/take`** view (sanitized). Never serve the raw quiz to a student.

---

## 3. Backend implementation

### 3.1 `can-manage-quiz` policy — `src/policies/can-manage-quiz.ts`
Loads the quiz, populates `course.owner`, applies Admin/CM-any + Instructor-own:
```ts
import { ROLE } from '../constants/roles';
export default async (policyContext, _config, { strapi }) => {
  const user = policyContext.state.user;
  const role = user?.role?.name;
  if (!user) return false;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true;
  if (role !== ROLE.INSTRUCTOR) return false;
  const quiz = await strapi.documents('api::quiz.quiz').findOne({
    documentId: policyContext.params.documentId,
    populate: { course: { populate: { owner: true } } },
  });
  return quiz?.course?.owner?.id === user.id;
};
```
(For `POST /api/quizzes`, use `can-manage-course` instead — the course is in the body.)

### 3.2 Quiz controller — sanitize on `/take`, grade on `/submit`
`src/api/quiz/controllers/quiz.ts`:
```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  // GET /api/quizzes/:documentId/take  — student view WITHOUT correct answers
  async take(ctx) {
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.documentId,
      populate: { questions: true },
    });
    if (!quiz) return ctx.notFound();

    // Strip the secret. Never send correctIndex to the client.
    const sanitized = {
      documentId: quiz.documentId,
      title: quiz.title,
      questions: (quiz.questions ?? []).map((q: any, i: number) => ({
        index: i,
        questionText: q.questionText,
        options: q.options,           // options only — NO correctIndex
      })),
    };
    return { data: sanitized };
  },

  // POST /api/quizzes/:documentId/submit  { data: { answers: number[] } }
  // Server-side auto-grading. The client sends only its chosen option indices.
  async submit(ctx) {
    const user = ctx.state.user;
    const answers: number[] = ctx.request.body?.data?.answers ?? [];

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.documentId,
      populate: { questions: true, course: true },
    });
    if (!quiz) return ctx.notFound();

    const questions = quiz.questions ?? [];
    if (answers.length !== questions.length) {
      return ctx.badRequest('Answer count does not match question count');
    }

    // ---- the grading logic (graded, explain line-by-line in the video) ----
    let score = 0;
    questions.forEach((q: any, i: number) => {
      if (Number(answers[i]) === Number(q.correctIndex)) score += 1;
    });
    const total = questions.length;

    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').create({
      data: {
        student: user.id,
        quiz: quiz.documentId,
        course: quiz.course?.documentId,
        answers,
        score,
        total,
        submittedAt: new Date(),
      },
    });

    // Return the score now; optionally reveal correct answers AFTER submission.
    return { data: { score, total, percent: Math.round((score / total) * 100), attemptDocumentId: attempt.documentId } };
  },

  // GET /api/quizzes/:documentId/attempts  — managers see all results for this quiz
  async attempts(ctx) {
    const rows = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
      filters: { quiz: { documentId: ctx.params.documentId } },
      populate: { student: true },
    });
    return { data: rows.map((a: any) => ({
      student: { id: a.student?.id, username: a.student?.username },
      score: a.score, total: a.total, submittedAt: a.submittedAt,
    })) };
  },
}));
```

### 3.3 QuizAttempt controller — student sees only their own
`src/api/quiz-attempt/controllers/quiz-attempt.ts`:
```ts
import { factories } from '@strapi/strapi';
export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async me(ctx) {                                  // GET /api/quiz-attempts/me
    const user = ctx.state.user;
    const rows = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
      filters: { student: user.id },
      populate: { quiz: true, course: true },
      sort: { submittedAt: 'desc' },
    });
    return { data: rows };
  },
}));
```

### 3.4 Routes
- `src/api/quiz/routes/custom.ts`: `take` and `submit` (authenticated, policy `is-enrolled`), `attempts` (policy `can-manage-quiz`).
- Default quiz `create` → policy `can-manage-course`; `update`/`delete`/manager `findOne` → `can-manage-quiz`.
- Quiz `create`/`update` controllers should set `course` from the body and validate each question has `options` (array length ≥ 2) and a `correctIndex` within range.
- `quiz-attempt` `me` route → `has-any-role({Student})`.

> **Lock down default quiz-attempt endpoints:** do NOT expose a public `GET /api/quiz-attempts` or `findOne` — a student could otherwise read others' attempts. Only the custom `me` (own) and the manager `attempts` (scoped) endpoints exist.

---

## 4. Frontend

### 4.1 Instructor/CM — quiz builder (`features/quiz/`)
- On a course's management page, "Quizzes" tab → create quiz: title + a repeatable question editor (question text, 2–6 option inputs, a radio to pick the correct option → maps to `correctIndex`).
- Server Actions `createQuiz`, `updateQuiz`, `deleteQuiz` (JWT via cookie). Validate client-side too, but the server re-validates.

### 4.2 Student — quiz taker
- `/student/courses/[documentId]/quiz/[quizId]` — a **Server Component** loads the quiz via `/take` (sanitized). Render each question with radio options.
- On submit, a Server Action calls `/submit` with just the chosen indices → returns `{ score, total, percent }`. Show the result immediately.
- **Confirm in the video** that the network payload for `/take` contains no `correctIndex`.

### 4.3 Results (viewable later)
- `/student/results` lists the student's attempts (`/api/quiz-attempts/me`): quiz title, score/total, date.
- Managers' course page shows a results table for each quiz (`/api/quizzes/:id/attempts`) — instructor for own courses only.

---

## 5. Edge cases (handle explicitly)
| Case | Expected |
|---|---|
| Correct answers in student payload | Never — `/take` strips `correctIndex`; grading uses the DB copy. |
| Answer count ≠ question count | `400`. |
| Answer index out of range | Counts as wrong (won't equal `correctIndex`); optionally `400`. |
| Quiz with 0 questions | Block creation (require ≥1 question); on submit, guard divide-by-zero. |
| Re-attempts | Allowed by default — each submit is a new `QuizAttempt` (history kept). If single-attempt is desired, check for an existing attempt and return `409`; **state which policy you chose** in the video. |
| Non-enrolled student calls `/take` or `/submit` | `403` via `is-enrolled`. |
| Student calls manager `attempts` endpoint | `403` (`can-manage-quiz`). |
| Instructor grades/reads a quiz on another instructor's course | `403`. |
| Tampering: client posts a fake `score` | Ignored — score is computed server-side; the client value is never trusted. |

---

## 6. Acceptance criteria / definition of done
- [ ] `Quiz` (+ `quiz.question` component) and `QuizAttempt` content-types created.
- [ ] `/take` returns questions + options but **no `correctIndex`** (verified in the network tab).
- [ ] `/submit` grades **server-side**, stores an attempt, returns the score immediately.
- [ ] Results are stored and viewable later (student: own; managers: scoped).
- [ ] Only enrolled students can take/submit; managers scoped by ownership.
- [ ] No endpoint leaks another student's attempts.
- [ ] All §5 edge cases handled.

---

## 7. Video talking points (quiz — reviewers want the grading shown in code)
1. **Answer-key safety:** open `/take`, show the sanitization mapping that drops `correctIndex`; show the browser payload has no answers.
2. **Grading logic line-by-line:** the `forEach` comparing `answers[i]` to `q.correctIndex`, incrementing `score`; then percent.
3. **Where the result is stored:** the `quiz-attempt` table; show a stored row.
4. **Trust boundary:** the client sends only chosen indices; the server owns the truth (correct answers + score).
