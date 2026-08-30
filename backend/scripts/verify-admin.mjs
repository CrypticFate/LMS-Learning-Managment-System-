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
  check(`login ${identifier}`, response.status === 200, `${response.status} ${JSON.stringify(response.body)}`);
  return response.body.jwt;
}

async function currentUser(jwt) {
  const response = await request('/api/users/me?populate=role', { jwt });
  check('load current user', response.status === 200, `${response.status} ${JSON.stringify(response.body)}`);
  return response.body;
}

async function ensureStudent(adminJwt) {
  const email = 'admin-verification-student@lms.test';
  const registration = await request('/api/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin_verification_student',
      email,
      password: PASSWORD,
    }),
  });
  const jwt = [200, 201].includes(registration.status)
    ? registration.body.jwt
    : await login(email);
  const user = await currentUser(jwt);
  if (user.role?.name !== 'Student') {
    const reset = await request(`/api/admin/users/${user.id}/role`, {
      jwt: adminJwt,
      method: 'PUT',
      body: JSON.stringify({ role: 'Student' }),
    });
    check('reset verification account to Student', reset.status === 200, JSON.stringify(reset.body));
  }
  return { jwt, user: { ...user, role: { ...user.role, name: 'Student' } } };
}

const stamp = Date.now();
const adminJwt = await login('admin@lms.test');
const instructorJwt = await login('instructor@lms.test');
const admin = await currentUser(adminJwt);
const verification = await ensureStudent(adminJwt);
let courseDocumentId;
let blogDocumentId;

try {
  let response = await request('/api/admin/users', { jwt: adminJwt });
  check(
    'Admin lists users with their roles',
    response.status === 200 &&
      response.body.data.some((user) => user.id === admin.id && user.role?.name === 'Admin'),
    JSON.stringify(response.body),
  );

  for (const [label, jwt, path] of [
    ['Instructor cannot list users', instructorJwt, '/api/admin/users'],
    ['Instructor cannot read stats', instructorJwt, '/api/admin/stats'],
    ['Instructor cannot list all blog posts', instructorJwt, '/api/admin/blog-posts'],
  ]) {
    response = await request(path, { jwt });
    check(label, response.status === 403, `${response.status} ${JSON.stringify(response.body)}`);
  }

  response = await request(`/api/admin/users/${verification.user.id}/role`, {
    jwt: instructorJwt,
    method: 'PUT',
    body: JSON.stringify({ role: 'Instructor' }),
  });
  check('Instructor cannot change a role', response.status === 403, String(response.status));

  response = await request(`/api/admin/users/${verification.user.id}/role`, {
    jwt: adminJwt,
    method: 'PUT',
    body: JSON.stringify({ role: 'Wizard' }),
  });
  check('Unknown role is rejected', response.status === 400, `${response.status} ${JSON.stringify(response.body)}`);

  response = await request(`/api/admin/users/${admin.id}/role`, {
    jwt: adminJwt,
    method: 'PUT',
    body: JSON.stringify({ role: 'Instructor' }),
  });
  check(
    'Last Admin cannot be demoted',
    response.status === 400 && JSON.stringify(response.body).includes('last remaining Admin'),
    `${response.status} ${JSON.stringify(response.body)}`,
  );

  response = await request('/api/admin/stats', { jwt: adminJwt });
  check(
    'Admin stats returns numeric totals and role counts',
    response.status === 200 &&
      ['totalUsers', 'totalCourses', 'totalEnrollments', 'totalBlogPosts'].every(
        (key) => Number.isInteger(response.body.data[key]) && response.body.data[key] >= 0,
      ) &&
      Number.isInteger(response.body.data.usersByRole.Admin),
    `${response.status} ${JSON.stringify(response.body)}`,
  );

  response = await request(`/api/admin/users/${verification.user.id}/role`, {
    jwt: adminJwt,
    method: 'PUT',
    body: JSON.stringify({ role: 'Instructor' }),
  });
  check('Admin promotes Student to Instructor', response.status === 200, JSON.stringify(response.body));

  response = await request('/api/courses', {
    jwt: verification.jwt,
    method: 'POST',
    body: JSON.stringify({
      data: {
        title: `Admin verification course ${stamp}`,
        description: 'Created after a live Student to Instructor role promotion',
      },
    }),
  });
  check('Promoted user creates a course', [200, 201].includes(response.status), JSON.stringify(response.body));
  courseDocumentId = response.body.data.documentId;
  response = await request('/api/courses/mine', { jwt: verification.jwt });
  const ownedCourse = response.body?.data?.find(
    (course) => course.documentId === courseDocumentId,
  );
  check(
    'Promoted user owns the new course',
    response.status === 200 && ownedCourse?.owner?.id === verification.user.id,
    JSON.stringify(response.body),
  );

  response = await request('/api/blog-posts', {
    jwt: instructorJwt,
    method: 'POST',
    body: JSON.stringify({
      data: {
        title: `Admin verification draft ${stamp}`,
        excerpt: 'A temporary cross-author management check.',
        content: 'The Admin should be able to edit, publish, unpublish, and delete this draft.',
      },
    }),
  });
  check('Instructor creates a blog draft', [200, 201].includes(response.status), JSON.stringify(response.body));
  blogDocumentId = response.body.data.documentId;

  response = await request('/api/admin/blog-posts', { jwt: adminJwt });
  check(
    'Admin sees another author\'s draft',
    response.status === 200 && response.body.data.some((post) => post.documentId === blogDocumentId),
    JSON.stringify(response.body),
  );

  response = await request(`/api/blog-posts/${blogDocumentId}`, {
    jwt: adminJwt,
    method: 'PUT',
    body: JSON.stringify({
      data: {
        title: `Admin-edited draft ${stamp}`,
        excerpt: 'Edited by an Admin.',
        content: 'This content was edited by an Admin who does not own the post.',
      },
    }),
  });
  check('Admin edits another author\'s draft', response.status === 200, JSON.stringify(response.body));

  response = await request(`/api/blog-posts/${blogDocumentId}/publish`, {
    jwt: adminJwt,
    method: 'POST',
  });
  check('Admin publishes another author\'s draft', response.status === 200, JSON.stringify(response.body));

  response = await request('/api/admin/blog-posts', { jwt: adminJwt });
  check(
    'Published state appears in the Admin list',
    response.status === 200 &&
      response.body.data.some((post) => post.documentId === blogDocumentId && post.isPublished),
    JSON.stringify(response.body),
  );

  response = await request(`/api/blog-posts/${blogDocumentId}/unpublish`, {
    jwt: adminJwt,
    method: 'POST',
  });
  check('Admin unpublishes another author\'s post', response.status === 200, JSON.stringify(response.body));
} finally {
  if (blogDocumentId) {
    const deletion = await request(`/api/blog-posts/${blogDocumentId}`, {
      jwt: adminJwt,
      method: 'DELETE',
    });
    check('cleanup blog post', [200, 204].includes(deletion.status), JSON.stringify(deletion.body));
  }
  if (courseDocumentId) {
    const deletion = await request(`/api/courses/${courseDocumentId}`, {
      jwt: adminJwt,
      method: 'DELETE',
    });
    check('cleanup promoted-user course', [200, 204].includes(deletion.status), JSON.stringify(deletion.body));
  }
  const roleReset = await request(`/api/admin/users/${verification.user.id}/role`, {
    jwt: adminJwt,
    method: 'PUT',
    body: JSON.stringify({ role: 'Student' }),
  });
  check('restore verification account role', roleReset.status === 200, JSON.stringify(roleReset.body));
}

console.log('Admin panel verification passed.');
