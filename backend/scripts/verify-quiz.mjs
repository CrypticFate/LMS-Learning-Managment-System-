const BASE_URL = (process.env.STRAPI_URL ?? 'http://127.0.0.1:1337').replace(/\/$/, '');
const PASSWORD = 'Passw0rd!';

async function request(path, { jwt, ...options } = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const raw = await response.text();
  let body = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    body = raw;
  }
  return { status: response.status, body };
}

function check(label, condition, details = '') {
  if (!condition) throw new Error(`${label} failed${details ? `: ${details}` : ''}`);
  console.log(`PASS ${label}`);
}

async function login(identifier) {
  const response = await request('/api/auth/local', {
    method: 'POST',
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  check(`login ${identifier}`, response.status === 200, String(response.status));
  return response.body.jwt;
}

async function currentUser(jwt) {
  const response = await request('/api/users/me?populate=role', { jwt });
  check('load current user', response.status === 200, String(response.status));
  return response.body;
}

async function ensureAccount(adminJwt, { email, username, role }) {
  const registration = await request('/api/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({ email, username, password: PASSWORD }),
  });
  let jwt = [200, 201].includes(registration.status)
    ? registration.body.jwt
    : await login(email);
  const user = await currentUser(jwt);
  if (user.role?.name !== role) {
    const promotion = await request(`/api/admin/users/${user.id}/role`, {
      jwt: adminJwt,
      method: 'PUT',
      body: JSON.stringify({ data: { role } }),
    });
    check(`set ${email} role`, promotion.status === 200, String(promotion.status));
    jwt = await login(email);
  }
  return jwt;
}

async function createCourse(jwt, title) {
  const response = await request('/api/courses', {
    jwt,
    method: 'POST',
    body: JSON.stringify({
      data: { title, description: 'Quiz verification course' },
    }),
  });
  check(`create course ${title}`, [200, 201].includes(response.status), String(response.status));
  return response.body.data;
}

async function createQuiz(jwt, courseDocumentId, title) {
  const response = await request('/api/quizzes', {
    jwt,
    method: 'POST',
    body: JSON.stringify({
      data: {
        title,
        course: courseDocumentId,
        questions: [
          {
            questionText: 'Which number is even?',
            options: ['One', 'Two', 'Three'],
            correctIndex: 1,
          },
          {
            questionText: 'Which color is a primary color?',
            options: ['Green', 'Purple', 'Blue'],
            correctIndex: 2,
          },
        ],
      },
    }),
  });
  check(`create quiz ${title}`, [200, 201].includes(response.status), JSON.stringify(response.body));
  return response.body.data;
}

const stamp = Date.now();
const [adminJwt, managerJwt, instructorJwt, studentJwt] = await Promise.all([
  login('admin@lms.test'),
  login('manager@lms.test'),
  login('instructor@lms.test'),
  login('student@lms.test'),
]);
const [otherInstructorJwt, otherStudentJwt] = await Promise.all([
  ensureAccount(adminJwt, {
    email: 'instructor-two@lms.test',
    username: 'instructor_two',
    role: 'Instructor',
  }),
  ensureAccount(adminJwt, {
    email: 'default-student@lms.test',
    username: 'default_student',
    role: 'Student',
  }),
]);

let course;
let foreignCourse;
let quiz;
let foreignQuiz;

try {
  course = await createCourse(instructorJwt, `Quiz verification ${stamp}`);
  foreignCourse = await createCourse(otherInstructorJwt, `Foreign quiz verification ${stamp}`);

  let response = await request('/api/quizzes', {
    jwt: instructorJwt,
    method: 'POST',
    body: JSON.stringify({
      data: { title: 'Empty quiz', course: course.documentId, questions: [] },
    }),
  });
  check('zero-question quiz is rejected', response.status === 400, String(response.status));

  response = await request('/api/quizzes', {
    jwt: instructorJwt,
    method: 'POST',
    body: JSON.stringify({
      data: {
        title: 'Bad options',
        course: course.documentId,
        questions: [{ questionText: 'Bad', options: ['Only one'], correctIndex: 0 }],
      },
    }),
  });
  check('question with fewer than two options is rejected', response.status === 400, String(response.status));

  response = await request('/api/quizzes', {
    jwt: instructorJwt,
    method: 'POST',
    body: JSON.stringify({
      data: {
        title: 'Bad answer index',
        course: course.documentId,
        questions: [{ questionText: 'Bad', options: ['A', 'B'], correctIndex: 4 }],
      },
    }),
  });
  check('invalid correct answer index is rejected', response.status === 400, String(response.status));

  quiz = await createQuiz(instructorJwt, course.documentId, `Secure quiz ${stamp}`);
  foreignQuiz = await createQuiz(
    otherInstructorJwt,
    foreignCourse.documentId,
    `Foreign secure quiz ${stamp}`,
  );

  response = await request(`/api/quizzes/${quiz.documentId}/take`, { jwt: studentJwt });
  check('non-enrolled student cannot take quiz', response.status === 403, String(response.status));
  response = await request(`/api/quizzes/${quiz.documentId}/submit`, {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { answers: [1, 2] } }),
  });
  check('non-enrolled student cannot submit quiz', response.status === 403, String(response.status));

  response = await request('/api/enrollments', {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { course: course.documentId } }),
  });
  check('student enrolls in quiz course', [200, 201, 409].includes(response.status), String(response.status));

  response = await request(`/api/quizzes/${quiz.documentId}/take`, { jwt: studentJwt });
  const takePayload = JSON.stringify(response.body);
  check(
    'take payload contains questions and options',
    response.status === 200 &&
      response.body.data.questions.length === 2 &&
      response.body.data.questions[0].options.length === 3,
    takePayload,
  );
  check('take payload never contains correctIndex', !takePayload.includes('correctIndex'), takePayload);

  response = await request(`/api/courses/${course.documentId}/quizzes`, { jwt: studentJwt });
  const summaryPayload = JSON.stringify(response.body);
  check(
    'student quiz list is metadata only',
    response.status === 200 &&
      response.body.data.some((item) => item.documentId === quiz.documentId) &&
      !summaryPayload.includes('correctIndex'),
    summaryPayload,
  );

  response = await request(`/api/quizzes/${quiz.documentId}`, { jwt: studentJwt });
  check('student cannot read manager quiz payload', response.status === 403, String(response.status));
  response = await request(`/api/quizzes/${quiz.documentId}`, { jwt: instructorJwt });
  check(
    'owner manager payload includes answer key',
    response.status === 200 &&
      response.body.data.questions[0].correctIndex === 1,
    JSON.stringify(response.body),
  );

  response = await request(`/api/quizzes/${quiz.documentId}`, {
    jwt: instructorJwt,
    method: 'PUT',
    body: JSON.stringify({
      data: {
        title: `Secure quiz updated ${stamp}`,
        course: foreignCourse.documentId,
        questions: [
          {
            questionText: 'Which number is even?',
            options: ['One', 'Two', 'Three'],
            correctIndex: 1,
          },
          {
            questionText: 'Which color is a primary color?',
            options: ['Green', 'Purple', 'Blue'],
            correctIndex: 2,
          },
        ],
      },
    }),
  });
  check('owner updates own quiz', response.status === 200, JSON.stringify(response.body));
  response = await request(`/api/quizzes/${quiz.documentId}`, { jwt: instructorJwt });
  check(
    'quiz update cannot move it to another course',
    response.status === 200 &&
      response.body.data.course.documentId === course.documentId,
    JSON.stringify(response.body),
  );

  response = await request(`/api/quizzes/${quiz.documentId}/submit`, {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { answers: [1] } }),
  });
  check('answer count mismatch is rejected', response.status === 400, String(response.status));
  response = await request(`/api/quizzes/${quiz.documentId}/submit`, {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { answers: [1, 99] } }),
  });
  check('out-of-range answer is rejected', response.status === 400, String(response.status));

  response = await request(`/api/quizzes/${quiz.documentId}/submit`, {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { answers: [1, 0], score: 999, total: 1 } }),
  });
  const firstAttemptId = response.body?.data?.attemptDocumentId;
  check(
    'server ignores fake score and grades first attempt',
    [200, 201].includes(response.status) &&
      response.body.data.score === 1 &&
      response.body.data.total === 2 &&
      response.body.data.percent === 50,
    JSON.stringify(response.body),
  );

  response = await request(`/api/quizzes/${quiz.documentId}/submit`, {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { answers: [1, 2] } }),
  });
  const secondAttemptId = response.body?.data?.attemptDocumentId;
  check(
    'reattempt is stored and graded independently',
    [200, 201].includes(response.status) &&
      response.body.data.score === 2 &&
      response.body.data.total === 2 &&
      secondAttemptId !== firstAttemptId,
    JSON.stringify(response.body),
  );

  response = await request('/api/quiz-attempts/me', { jwt: studentJwt });
  const ownIds = response.body?.data?.map((attempt) => attempt.documentId) ?? [];
  check(
    'student results history contains both stored attempts',
    response.status === 200 && ownIds.includes(firstAttemptId) && ownIds.includes(secondAttemptId),
    JSON.stringify(response.body),
  );
  response = await request('/api/quiz-attempts/me', { jwt: otherStudentJwt });
  check(
    'another student cannot see these attempts',
    response.status === 200 &&
      !response.body.data.some((attempt) => ownIds.includes(attempt.documentId)),
    JSON.stringify(response.body),
  );
  response = await request('/api/quiz-attempts', { jwt: studentJwt });
  check('default quiz-attempt list is not exposed', response.status === 404, String(response.status));

  for (const [label, jwt, expected] of [
    ['owner reads quiz attempts', instructorJwt, 200],
    ['content manager reads quiz attempts', managerJwt, 200],
    ['admin reads quiz attempts', adminJwt, 200],
    ['other instructor cannot read quiz attempts', otherInstructorJwt, 403],
    ['student cannot read manager attempts', studentJwt, 403],
  ]) {
    response = await request(`/api/quizzes/${quiz.documentId}/attempts`, { jwt });
    check(label, response.status === expected, String(response.status));
    if (expected === 200) {
      check(
        `${label} returns both results`,
        response.body.data.length === 2 &&
          response.body.data.some((attempt) => attempt.percent === 50) &&
          response.body.data.some((attempt) => attempt.percent === 100),
        JSON.stringify(response.body),
      );
    }
  }

  response = await request(`/api/quizzes/${quiz.documentId}`, {
    jwt: otherInstructorJwt,
    method: 'PUT',
    body: JSON.stringify({
      data: {
        title: 'Forbidden quiz edit',
        questions: [{ questionText: 'No', options: ['A', 'B'], correctIndex: 0 }],
      },
    }),
  });
  check('other instructor cannot edit quiz', response.status === 403, String(response.status));

  response = await request(`/api/quizzes/${foreignQuiz.documentId}/submit`, {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({
      data: { course: course.documentId, answers: [1, 2], score: 999 },
    }),
  });
  check('client course cannot bypass quiz enrollment', response.status === 403, String(response.status));
} finally {
  for (const item of [quiz, foreignQuiz]) {
    if (item) {
      await request(`/api/quizzes/${item.documentId}`, { jwt: adminJwt, method: 'DELETE' });
    }
  }
  for (const item of [course, foreignCourse]) {
    if (item) {
      await request(`/api/courses/${item.documentId}`, { jwt: adminJwt, method: 'DELETE' });
    }
  }
}

console.log('Quiz auto-grading verification passed.');
