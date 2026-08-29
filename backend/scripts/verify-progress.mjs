const BASE_URL = (process.env.STRAPI_URL ?? 'http://127.0.0.1:1337').replace(/\/$/, '');
const PASSWORD = 'Passw0rd!';

async function request(path, { jwt, ...options } = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (jwt) headers.set('Authorization', `Bearer ${jwt}`);
  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

async function login(identifier) {
  const response = await request('/api/auth/local', {
    method: 'POST',
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (response.status !== 200) throw new Error(`Login failed for ${identifier}`);
  return response.body.jwt;
}

function check(label, condition, details = '') {
  if (!condition) throw new Error(`${label} failed${details ? `: ${details}` : ''}`);
  console.log(`PASS ${label}`);
}

async function createCourse(jwt, title) {
  const response = await request('/api/courses', {
    jwt,
    method: 'POST',
    body: JSON.stringify({ data: { title, description: 'Progress verification course' } }),
  });
  check('course creation', [200, 201].includes(response.status), String(response.status));
  return response.body.data;
}

async function createLesson(jwt, courseDocumentId, title, order) {
  const response = await request('/api/lessons', {
    jwt,
    method: 'POST',
    body: JSON.stringify({
      data: { title, content: title, order, course: courseDocumentId },
    }),
  });
  check(`lesson creation: ${title}`, [200, 201].includes(response.status), String(response.status));
  return response.body.data;
}

const stamp = Date.now();
const [adminJwt, managerJwt, instructorJwt, otherInstructorJwt, studentJwt, otherStudentJwt] =
  await Promise.all([
    login('admin@lms.test'),
    login('manager@lms.test'),
    login('instructor@lms.test'),
    login('instructor-two@lms.test'),
    login('student@lms.test'),
    login('default-student@lms.test'),
  ]);

let course;
let foreignCourse;
const lessons = [];
const foreignLessons = [];

try {
  course = await createCourse(instructorJwt, `Progress verification ${stamp}`);
  foreignCourse = await createCourse(otherInstructorJwt, `Foreign progress verification ${stamp}`);

  let response = await request(`/api/progress/course/${course.documentId}`, { jwt: studentJwt });
  check('non-enrolled student cannot read course progress', response.status === 403, String(response.status));

  response = await request('/api/enrollments', {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { course: course.documentId } }),
  });
  check('student enrollment', [200, 201].includes(response.status), String(response.status));

  response = await request(`/api/progress/course/${course.documentId}`, { jwt: studentJwt });
  check(
    'zero-lesson course is 0%',
    response.status === 200 && response.body.data.totalLessons === 0 && response.body.data.percent === 0,
    JSON.stringify(response.body),
  );

  const first = await createLesson(instructorJwt, course.documentId, 'Progress first', 1);
  const second = await createLesson(instructorJwt, course.documentId, 'Progress second', 2);
  const foreign = await createLesson(otherInstructorJwt, foreignCourse.documentId, 'Foreign lesson', 1);
  lessons.push(first, second);
  foreignLessons.push(foreign);

  response = await request('/api/progress/complete', {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { lesson: foreign.documentId, course: course.documentId } }),
  });
  check('client course cannot bypass lesson enrollment', response.status === 403, String(response.status));

  response = await request('/api/progress/complete', {
    jwt: otherStudentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { lesson: first.documentId } }),
  });
  check('non-enrolled student cannot complete lesson', response.status === 403, String(response.status));

  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await request('/api/progress/complete', {
      jwt: studentJwt,
      method: 'POST',
      body: JSON.stringify({ data: { lesson: first.documentId, course: foreignCourse.documentId } }),
    });
    check(`mark complete attempt ${attempt + 1}`, [200, 201].includes(response.status), String(response.status));
  }

  response = await request(`/api/progress/course/${course.documentId}`, { jwt: studentJwt });
  check(
    'idempotent completion persists at 1 of 2 (50%)',
    response.status === 200 &&
      response.body.data.completed === 1 &&
      response.body.data.totalLessons === 2 &&
      response.body.data.percent === 50 &&
      response.body.data.completedLessonDocumentIds.includes(first.documentId),
    JSON.stringify(response.body),
  );

  response = await request('/api/progress/me', { jwt: studentJwt });
  check(
    'My Courses summary contains persisted progress',
    response.status === 200 && response.body.data.some(
      (row) => row.courseDocumentId === course.documentId && row.percent === 50,
    ),
    JSON.stringify(response.body),
  );

  for (const [label, jwt, expected] of [
    ['owner instructor sees progress', instructorJwt, 200],
    ['content manager sees progress', managerJwt, 200],
    ['admin sees progress', adminJwt, 200],
    ['other instructor is denied', otherInstructorJwt, 403],
    ['student is denied staff report', studentJwt, 403],
  ]) {
    response = await request(`/api/courses/${course.documentId}/progress`, { jwt });
    check(label, response.status === expected, String(response.status));
    if (expected === 200) {
      check(
        `${label} with accurate student row`,
        response.body.data.some((row) => row.student.username === 'student' && row.percent === 50),
        JSON.stringify(response.body),
      );
    }
  }

  const third = await createLesson(instructorJwt, course.documentId, 'Progress third', 3);
  lessons.push(third);
  response = await request(`/api/progress/course/${course.documentId}`, { jwt: studentJwt });
  check(
    'adding a lesson recomputes denominator to 33%',
    response.status === 200 && response.body.data.completed === 1 &&
      response.body.data.totalLessons === 3 && response.body.data.percent === 33,
    JSON.stringify(response.body),
  );

  response = await request(`/api/progress/complete/${first.documentId}`, {
    jwt: studentJwt,
    method: 'DELETE',
  });
  check('unmark completion', response.status === 200, String(response.status));
  response = await request(`/api/progress/course/${course.documentId}`, { jwt: studentJwt });
  check('unmark recomputes to 0%', response.body.data.completed === 0 && response.body.data.percent === 0);

  response = await request('/api/progress/complete', {
    jwt: studentJwt,
    method: 'POST',
    body: JSON.stringify({ data: { lesson: second.documentId } }),
  });
  check('mark lesson before cascade test', [200, 201].includes(response.status));
  response = await request(`/api/lessons/${second.documentId}`, {
    jwt: instructorJwt,
    method: 'DELETE',
  });
  check('delete completed lesson', [200, 204].includes(response.status), String(response.status));
  lessons.splice(lessons.findIndex((lesson) => lesson.documentId === second.documentId), 1);

  response = await request(`/api/progress/course/${course.documentId}`, { jwt: studentJwt });
  check(
    'lesson deletion cascades its completion',
    response.status === 200 && response.body.data.completed === 0 &&
      response.body.data.totalLessons === 2 && response.body.data.percent === 0,
    JSON.stringify(response.body),
  );
} finally {
  for (const lesson of [...lessons, ...foreignLessons]) {
    await request(`/api/lessons/${lesson.documentId}`, { jwt: adminJwt, method: 'DELETE' });
  }
  for (const item of [course, foreignCourse]) {
    if (item) await request(`/api/courses/${item.documentId}`, { jwt: adminJwt, method: 'DELETE' });
  }
}

console.log('Progress verification passed.');
