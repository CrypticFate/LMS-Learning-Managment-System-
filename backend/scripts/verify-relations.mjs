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
  check(`login ${identifier}`, response.status === 200, JSON.stringify(response.body));
  return response.body.jwt;
}

async function create(path, jwt, data) {
  const response = await request(path, {
    jwt,
    method: 'POST',
    body: JSON.stringify({ data }),
  });
  check(`POST ${path}`, [200, 201].includes(response.status), JSON.stringify(response.body));
  return response.body.data;
}

const stamp = Date.now();
const [instructorJwt, studentJwt] = await Promise.all([
  login('instructor@lms.test'),
  login('student@lms.test'),
]);

const created = {
  courses: [],
  modules: [],
  lessons: [],
  quizzes: [],
  comments: [],
};

try {
  const courseA = await create('/api/courses', instructorJwt, {
    title: `Relations A ${stamp}`,
    description: 'Relation verification course A',
  });
  const courseB = await create('/api/courses', instructorJwt, {
    title: `Relations B ${stamp}`,
    description: 'Relation verification course B',
  });
  created.courses.push(courseA, courseB);

  const moduleA = await create('/api/modules', instructorJwt, {
    title: 'Shared module',
    description: 'Appears in two courses',
    order: 1,
    course: courseA.documentId,
  });
  const moduleB = await create('/api/modules', instructorJwt, {
    title: 'Second module',
    order: 2,
    course: courseA.documentId,
  });
  created.modules.push(moduleA, moduleB);

  let response = await request(
    `/api/courses/${courseB.documentId}/modules/${moduleA.documentId}`,
    { jwt: instructorJwt, method: 'POST' },
  );
  check('course-module many-to-many attach', response.status === 200, JSON.stringify(response.body));

  const lesson = await create('/api/lessons', instructorJwt, {
    title: 'Shared lesson',
    content: 'One lesson in multiple modules.',
    order: 1,
    module: moduleA.documentId,
  });
  created.lessons.push(lesson);

  response = await request(
    `/api/modules/${moduleB.documentId}/lessons/${lesson.documentId}`,
    { jwt: instructorJwt, method: 'POST' },
  );
  check('module-lesson many-to-many attach', response.status === 200, JSON.stringify(response.body));

  const quiz = await create('/api/quizzes', instructorJwt, {
    title: 'Shared quiz',
    module: moduleA.documentId,
    questions: [{
      questionText: 'Two plus two?',
      options: ['3', '4'],
      correctIndex: 1,
    }],
  });
  created.quizzes.push(quiz);

  response = await request(
    `/api/modules/${moduleB.documentId}/quizzes/${quiz.documentId}`,
    { jwt: instructorJwt, method: 'POST' },
  );
  check('module-quiz many-to-many attach', response.status === 200, JSON.stringify(response.body));

  for (const course of [courseA, courseB]) {
    await create('/api/enrollments', studentJwt, { course: course.documentId });
  }

  response = await request(`/api/courses/${courseB.documentId}/modules`, { jwt: studentJwt });
  check(
    'shared module visible in second enrolled course',
    response.status === 200 &&
      response.body.data.some((module) => module.documentId === moduleA.documentId),
    JSON.stringify(response.body),
  );

  response = await request(`/api/modules/${moduleB.documentId}/lessons`, { jwt: studentJwt });
  check(
    'shared lesson visible in second module',
    response.status === 200 &&
      response.body.data.some((item) => item.documentId === lesson.documentId),
    JSON.stringify(response.body),
  );

  const comment = await create('/api/comments', studentJwt, {
    lesson: lesson.documentId,
    body: 'Relation verifier comment',
  });
  created.comments.push(comment);

  response = await request(`/api/lessons/${lesson.documentId}/comments`, { jwt: studentJwt });
  check(
    'lesson one-to-many comments',
    response.status === 200 &&
      response.body.data.some((item) => item.documentId === comment.documentId),
    JSON.stringify(response.body),
  );

  for (const course of [courseA, courseB]) {
    response = await request('/api/progress/complete', {
      jwt: studentJwt,
      method: 'POST',
      body: JSON.stringify({
        data: { course: course.documentId, lesson: lesson.documentId },
      }),
    });
    check(
      `course-aware completion ${course.documentId}`,
      [200, 201].includes(response.status),
      JSON.stringify(response.body),
    );
  }

  response = await request(
    `/api/quizzes/${quiz.documentId}/take?course=${courseB.documentId}`,
    { jwt: studentJwt },
  );
  check(
    'course-aware shared quiz take',
    response.status === 200 && response.body.data.courseDocumentId === courseB.documentId,
    JSON.stringify(response.body),
  );

  response = await request(`/api/quizzes/${quiz.documentId}/submit`, {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({
      data: { course: courseB.documentId, answers: [1] },
    }),
  });
  check(
    'course-aware shared quiz grading',
    response.status === 200 && response.body.data.score === 1,
    JSON.stringify(response.body),
  );

  response = await request(
    `/api/modules/${moduleB.documentId}/lessons/${lesson.documentId}`,
    { jwt: instructorJwt, method: 'DELETE' },
  );
  check('detach lesson from one module', response.status === 200, JSON.stringify(response.body));

  response = await request(
    `/api/modules/${moduleB.documentId}/quizzes/${quiz.documentId}`,
    { jwt: instructorJwt, method: 'DELETE' },
  );
  check('detach quiz from one module', response.status === 200, JSON.stringify(response.body));

  response = await request(
    `/api/courses/${courseB.documentId}/modules/${moduleA.documentId}`,
    { jwt: instructorJwt, method: 'DELETE' },
  );
  check('detach module from one course', response.status === 200, JSON.stringify(response.body));

  response = await request(
    `/api/courses/${courseB.documentId}/modules/${moduleA.documentId}`,
    { jwt: studentJwt, method: 'POST' },
  );
  check('student cannot change relations', response.status === 403, String(response.status));

  console.log('Relation verification completed.');
} finally {
  for (const comment of created.comments) {
    await request(`/api/comments/${comment.documentId}`, { jwt: studentJwt, method: 'DELETE' });
  }
  for (const quiz of created.quizzes) {
    await request(`/api/quizzes/${quiz.documentId}`, { jwt: instructorJwt, method: 'DELETE' });
  }
  for (const lesson of created.lessons) {
    await request(`/api/lessons/${lesson.documentId}`, { jwt: instructorJwt, method: 'DELETE' });
  }
  for (const module of created.modules) {
    await request(`/api/modules/${module.documentId}`, { jwt: instructorJwt, method: 'DELETE' });
  }
  for (const course of created.courses) {
    await request(`/api/courses/${course.documentId}`, { jwt: instructorJwt, method: 'DELETE' });
  }
}
