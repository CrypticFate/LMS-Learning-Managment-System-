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

async function wait(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function login(identifier) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await request('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify({ identifier, password: PASSWORD }),
    });
    if (response.status === 200) {
      console.log(`PASS login ${identifier}`);
      return response.body.jwt;
    }
    if (response.status !== 429) {
      throw new Error(`Login failed for ${identifier}: ${response.status} ${JSON.stringify(response.body)}`);
    }
    await wait((attempt + 1) * 2000);
  }
  throw new Error(`Login rate limit did not clear for ${identifier}`);
}

async function currentUser(jwt) {
  const response = await request('/api/users/me?populate=role', { jwt });
  check('load current user', response.status === 200, JSON.stringify(response.body));
  return response.body;
}

async function ensureSecondManager(adminJwt) {
  const email = 'manager-two@lms.test';
  const registration = await request('/api/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({
      username: 'manager_two',
      email,
      password: PASSWORD,
    }),
  });
  const jwt = [200, 201].includes(registration.status)
    ? registration.body.jwt
    : await login(email);
  const user = await currentUser(jwt);
  if (user.role?.name !== 'Content Manager') {
    const promotion = await request(`/api/admin/users/${user.id}/role`, {
      jwt: adminJwt,
      method: 'PUT',
      body: JSON.stringify({ role: 'Content Manager' }),
    });
    check('promote second Content Manager', promotion.status === 200, JSON.stringify(promotion.body));
  }
  return { jwt, user };
}

async function createPost(jwt, data) {
  return request('/api/blog-posts', {
    jwt,
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

const stamp = Date.now();
const slug = `blog-verification-${stamp}`;
const adminJwt = await login('admin@lms.test');
const managerJwt = await login('manager@lms.test');
const instructorJwt = await login('instructor@lms.test');
const studentJwt = await login('student@lms.test');
const manager = await currentUser(managerJwt);
const secondManager = await ensureSecondManager(adminJwt);
const cleanupIds = new Set();

try {
  let response = await createPost(managerJwt, {
    title: `Blog verification ${stamp}`,
    slug,
    body: 'This draft must remain private until a Content Manager publishes it.',
    coverImageUrl: 'https://images.example.com/blog-verification.jpg',
    status: 'draft',
    author: secondManager.user.id,
  });
  check('Content Manager creates a draft', [200, 201].includes(response.status), JSON.stringify(response.body));
  const post = response.body.data;
  cleanupIds.add(post.documentId);
  check(
    'create ignores client-supplied author',
    post.author?.id === manager.id && post.author?.id !== secondManager.user.id,
    JSON.stringify(post),
  );
  check('draft status is stored explicitly', post.status === 'draft' && !post.publishedAt, JSON.stringify(post));

  response = await request('/api/blog-posts');
  check(
    'public list excludes draft',
    response.status === 200 && !response.body.data.some((item) => item.documentId === post.documentId),
    JSON.stringify(response.body),
  );

  response = await request('/api/blog-posts?filters[status][$eq]=draft');
  check(
    'crafted draft filter is ignored',
    response.status === 200 && !response.body.data.some((item) => item.documentId === post.documentId),
    JSON.stringify(response.body),
  );

  response = await request(`/api/blog-posts/${slug}`);
  check('public draft detail returns 404', response.status === 404, JSON.stringify(response.body));
  response = await request(`/api/blog-posts/${post.documentId}`);
  check('default document-id read cannot leak draft', response.status === 404, JSON.stringify(response.body));

  for (const [label, jwt] of [
    ['Instructor cannot create a post', instructorJwt],
    ['Student cannot create a post', studentJwt],
  ]) {
    response = await createPost(jwt, {
      title: `${label} ${stamp}`,
      body: 'This request should be blocked by the role policy.',
    });
    check(label, response.status === 403, `${response.status} ${JSON.stringify(response.body)}`);
  }

  response = await request('/api/blog-posts/mine', { jwt: instructorJwt });
  check('Instructor cannot open author management', response.status === 403, String(response.status));

  response = await request(`/api/blog-posts/${post.documentId}`, {
    jwt: secondManager.jwt,
    method: 'PUT',
    body: JSON.stringify({ data: { title: 'Forbidden cross-author edit' } }),
  });
  check('Content Manager cannot edit another manager post', response.status === 403, String(response.status));
  response = await request(`/api/blog-posts/${post.documentId}`, {
    jwt: secondManager.jwt,
    method: 'DELETE',
  });
  check('Content Manager cannot delete another manager post', response.status === 403, String(response.status));

  response = await request('/api/blog-posts/mine', { jwt: secondManager.jwt });
  check(
    'Content Manager mine endpoint excludes another author post',
    response.status === 200 && !response.body.data.some((item) => item.documentId === post.documentId),
    JSON.stringify(response.body),
  );
  response = await request('/api/blog-posts/mine', { jwt: adminJwt });
  check(
    'Admin mine endpoint includes every author post',
    response.status === 200 && response.body.data.some((item) => item.documentId === post.documentId),
    JSON.stringify(response.body),
  );

  response = await request(`/api/blog-posts/${post.documentId}`, {
    jwt: adminJwt,
    method: 'PUT',
    body: JSON.stringify({
      data: {
        title: `Admin-reviewed blog verification ${stamp}`,
        author: secondManager.user.id,
      },
    }),
  });
  check('Admin edits another author post', response.status === 200, JSON.stringify(response.body));
  check(
    'update ignores client-supplied author',
    response.body.data.author?.id === manager.id,
    JSON.stringify(response.body),
  );

  response = await request(`/api/blog-posts/${post.documentId}`, {
    jwt: managerJwt,
    method: 'PUT',
    body: JSON.stringify({ data: { status: 'published' } }),
  });
  check(
    'owner publishes post and publishedAt is stamped',
    response.status === 200 &&
      response.body.data.status === 'published' &&
      typeof response.body.data.publishedAt === 'string',
    JSON.stringify(response.body),
  );

  response = await request('/api/blog-posts');
  const publicPost = response.body?.data?.find((item) => item.documentId === post.documentId);
  check('published post appears in public list', response.status === 200 && publicPost, JSON.stringify(response.body));
  check(
    'public list exposes only the public author shape',
    publicPost &&
      Object.keys(publicPost.author ?? {}).join(',') === 'username' &&
      !Object.prototype.hasOwnProperty.call(publicPost, 'status'),
    JSON.stringify(publicPost),
  );

  response = await request(`/api/blog-posts/${slug}`);
  check(
    'anyone opens the published post by slug',
    response.status === 200 && response.body.data.documentId === post.documentId,
    JSON.stringify(response.body),
  );

  response = await createPost(secondManager.jwt, {
    title: `Duplicate slug ${stamp}`,
    slug,
    body: 'The duplicate UID should be rejected cleanly.',
  });
  check(
    'duplicate slug returns a clean 400',
    response.status === 400 && JSON.stringify(response.body).includes('Slug is already in use'),
    `${response.status} ${JSON.stringify(response.body)}`,
  );

  response = await request(`/api/blog-posts/${post.documentId}`, {
    jwt: managerJwt,
    method: 'PUT',
    body: JSON.stringify({ data: { status: 'draft' } }),
  });
  check('owner unpublishes post', response.status === 200 && response.body.data.status === 'draft', JSON.stringify(response.body));
  response = await request('/api/blog-posts');
  check(
    'unpublished post immediately disappears from public list',
    response.status === 200 && !response.body.data.some((item) => item.documentId === post.documentId),
    JSON.stringify(response.body),
  );
  response = await request(`/api/blog-posts/${slug}`);
  check('unpublished detail returns 404 again', response.status === 404, JSON.stringify(response.body));
} finally {
  for (const documentId of cleanupIds) {
    const deletion = await request(`/api/blog-posts/${documentId}`, {
      jwt: adminJwt,
      method: 'DELETE',
    });
    check(`cleanup blog post ${documentId}`, [200, 204, 404].includes(deletion.status), JSON.stringify(deletion.body));
  }
}

console.log('Blog verification passed.');
