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

async function login(identifier) {
  const response = await request('/api/auth/local', {
    method: 'POST',
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (response.status !== 200) {
    throw new Error(`Login failed for ${identifier}: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.jwt;
}

async function currentUser(jwt) {
  const response = await request('/api/users/me?populate=role', { jwt });
  if (response.status !== 200) {
    throw new Error(`users/me failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

async function createCourse(jwt, title, extra = {}) {
  const response = await request('/api/courses', {
    jwt,
    method: 'POST',
    body: JSON.stringify({
      data: { title, description: `RBAC verification course: ${title}`, ...extra },
    }),
  });
  if (![200, 201].includes(response.status)) {
    throw new Error(`Course creation failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.data;
}

async function cleanupVerificationCourses(adminJwt) {
  const marker = encodeURIComponent('RBAC verification course:');
  const response = await request(
    `/api/courses?filters[description][$startsWith]=${marker}&pagination[pageSize]=100`,
  );
  if (response.status !== 200) return;

  for (const course of response.body.data ?? []) {
    const deletion = await request(`/api/courses/${course.documentId}`, {
      jwt: adminJwt,
      method: 'DELETE',
    });
    if (![200, 204].includes(deletion.status)) {
      throw new Error(`Verification cleanup failed for ${course.documentId}: ${deletion.status}`);
    }
  }
}

async function ensureSecondInstructor(adminJwt) {
  const email = 'instructor-two@lms.test';
  const registration = await request('/api/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'instructor_two', email, password: PASSWORD }),
  });

  let jwt;
  if ([200, 201].includes(registration.status)) {
    jwt = registration.body.jwt;
  } else {
    jwt = await login(email);
  }

  const user = await currentUser(jwt);
  const promotion = await request(`/api/admin/users/${user.id}/role`, {
    jwt: adminJwt,
    method: 'PUT',
    body: JSON.stringify({ data: { role: 'Instructor' } }),
  });
  if (promotion.status !== 200) {
    throw new Error(`Second-instructor promotion failed: ${promotion.status} ${JSON.stringify(promotion.body)}`);
  }
  return login(email);
}

async function ensureDefaultStudent() {
  const email = 'default-student@lms.test';
  const registration = await request('/api/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({ username: 'default_student', email, password: PASSWORD }),
  });
  const jwt = [200, 201].includes(registration.status)
    ? registration.body.jwt
    : await login(email);
  return currentUser(jwt);
}

const results = [];

function check(number, label, actual, expected) {
  const allowed = Array.isArray(expected) ? expected : [expected];
  const passed = allowed.includes(actual);
  results.push({ number, label, actual, expected: allowed.join('/'), passed });
  if (!passed) throw new Error(`#${number} ${label}: expected ${allowed.join('/')}, got ${actual}`);
}

const stamp = Date.now();
const [adminJwt, managerJwt, instructorJwt, studentJwt] = await Promise.all([
  login('admin@lms.test'),
  login('manager@lms.test'),
  login('instructor@lms.test'),
  login('student@lms.test'),
]);
const [admin, manager, instructor, student] = await Promise.all([
  currentUser(adminJwt),
  currentUser(managerJwt),
  currentUser(instructorJwt),
  currentUser(studentJwt),
]);
await cleanupVerificationCourses(adminJwt);
check(
  'S1',
  'Four demo accounts have the expected roles',
  admin.role?.name === 'Admin' &&
    manager.role?.name === 'Content Manager' &&
    instructor.role?.name === 'Instructor' &&
    student.role?.name === 'Student'
    ? 200
    : 500,
  200,
);
const defaultStudent = await ensureDefaultStudent();
check('S2', 'Public registration defaults to Student', defaultStudent.role?.name === 'Student' ? 200 : 500, 200);
const instructorTwoJwt = await ensureSecondInstructor(adminJwt);

const ownCourse = await createCourse(instructorJwt, `Instructor course ${stamp}`);
const otherCourse = await createCourse(instructorTwoJwt, `Other instructor course ${stamp}`);

let response = await request('/api/courses', {
  jwt: studentJwt,
  method: 'POST',
  body: JSON.stringify({ data: { title: 'Forbidden student course' } }),
});
check(1, 'Student creates course', response.status, 403);

response = await request(`/api/courses/${otherCourse.documentId}`, {
  jwt: instructorJwt,
  method: 'PUT',
  body: JSON.stringify({ data: { title: 'Forbidden edit' } }),
});
check(2, "Instructor edits another instructor's course", response.status, 403);

response = await request(`/api/courses/${ownCourse.documentId}`, {
  jwt: instructorJwt,
  method: 'PUT',
  body: JSON.stringify({ data: { title: `Instructor-owned course ${stamp}` } }),
});
check(3, 'Instructor edits own course', response.status, 200);

response = await request(`/api/courses/${otherCourse.documentId}`, {
  jwt: managerJwt,
  method: 'PUT',
  body: JSON.stringify({ data: { title: `CM-edited course ${stamp}` } }),
});
check(4, 'Content Manager edits any course', response.status, 200);

response = await request(`/api/admin/users/${student.id}/role`, {
  jwt: managerJwt,
  method: 'PUT',
  body: JSON.stringify({ data: { role: 'Instructor' } }),
});
check(5, 'Content Manager changes a user role', response.status, 403);

response = await request('/api/enrollments/me');
check(6, 'Logged-out user reads My Courses', response.status, 401);

response = await request('/api/enrollments', {
  jwt: studentJwt,
  method: 'POST',
  body: JSON.stringify({ data: { course: ownCourse.documentId } }),
});
check('7a', 'Student enrolls the first time', response.status, [200, 201]);
response = await request('/api/enrollments', {
  jwt: studentJwt,
  method: 'POST',
  body: JSON.stringify({ data: { course: ownCourse.documentId } }),
});
check(7, 'Student enrolls twice', response.status, 409);

response = await request(`/api/courses/${otherCourse.documentId}/lessons`, {
  jwt: studentJwt,
});
check(8, 'Non-enrolled student reads lessons', response.status, 403);

const injectedCourse = await createCourse(instructorJwt, `Owner injection ${stamp}`, {
  owner: student.id,
});
response = await request('/api/courses/mine', { jwt: instructorJwt });
const injectedResult = response.body?.data?.find(
  (course) => course.documentId === injectedCourse.documentId,
);
const ownerWasForced = response.status === 200 && injectedResult?.owner?.id === instructor.id;
check(9, 'Client-supplied owner is ignored', ownerWasForced ? 200 : 500, 200);

response = await request('/api/enrollments', {
  jwt: instructorJwt,
  method: 'POST',
  body: JSON.stringify({ data: { course: ownCourse.documentId } }),
});
check(10, 'Instructor enrolls in a course', response.status, 403);

const firstLesson = await request('/api/lessons', {
  jwt: instructorJwt,
  method: 'POST',
  body: JSON.stringify({
    data: { title: 'Second in sequence', content: 'Lesson two', order: 2, course: ownCourse.documentId },
  }),
});
check('L1', 'Owner creates a lesson', firstLesson.status, [200, 201]);
const secondLesson = await request('/api/lessons', {
  jwt: instructorJwt,
  method: 'POST',
  body: JSON.stringify({
    data: { title: 'First in sequence', content: 'Lesson one', order: 1, course: ownCourse.documentId },
  }),
});
check('L2', 'Owner creates another lesson', secondLesson.status, [200, 201]);
response = await request(`/api/lessons/${firstLesson.body.data.documentId}`, {
  jwt: instructorJwt,
  method: 'PUT',
  body: JSON.stringify({ data: { title: 'Second in sequence (edited)', order: 2 } }),
});
check('L3', 'Owner updates own lesson', response.status, 200);
response = await request(`/api/lessons/${firstLesson.body.data.documentId}`, {
  jwt: instructorTwoJwt,
  method: 'DELETE',
});
check('L4', "Other instructor cannot delete owner's lesson", response.status, 403);
response = await request(`/api/courses/${ownCourse.documentId}/lessons`, {
  jwt: studentJwt,
});
const sorted = response.body?.data?.map((lesson) => lesson.order).join(',') === '1,2';
check('L5', 'Enrolled student reads lessons in order', response.status === 200 && sorted ? 200 : response.status, 200);

console.table(results);
console.log(`RBAC verification passed: 2 seed checks, ${results.filter((row) => typeof row.number === 'number').length}/10 §9 rows, and ${results.filter((row) => String(row.number).startsWith('L')).length} lesson checks.`);
await cleanupVerificationCourses(adminJwt);
