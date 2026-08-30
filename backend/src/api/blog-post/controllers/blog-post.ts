import { factories } from '@strapi/strapi';

type BlogStatus = 'draft' | 'published';

const AUTHOR_POPULATE: any = {
  author: { fields: ['id', 'documentId', 'username'] },
};

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

function parseStatus(value: unknown, fallback?: BlogStatus): BlogStatus {
  if (value === undefined && fallback) return fallback;
  if (value === 'draft' || value === 'published') return value;
  throw new Error('status must be draft or published');
}

function parseCoverImageUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('coverImageUrl must be a URL');

  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new Error('coverImageUrl must be a valid http(s) URL');
  }
}

function publicShape(post: any) {
  return {
    documentId: post.documentId,
    title: post.title,
    slug: post.slug,
    body: post.body,
    coverImageUrl: post.coverImageUrl,
    // Strapi v5 reserves publishedAt even with native D&P disabled. Keep the
    // app-controlled timestamp in publicationDate and expose the planned name.
    publishedAt: post.publicationDate ?? null,
    author: post.author ? { username: post.author.username } : null,
  };
}

function managementShape(post: any) {
  return {
    id: post.id,
    documentId: post.documentId,
    title: post.title,
    slug: post.slug,
    body: post.body,
    coverImageUrl: post.coverImageUrl,
    status: post.status,
    publishedAt: post.publicationDate ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: post.author
      ? {
          id: post.author.id,
          documentId: post.author.documentId,
          username: post.author.username,
        }
      : null,
  };
}

export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({
    async find(_ctx) {
      const posts = await strapi.documents('api::blog-post.blog-post').findMany({
        filters: { status: { $eq: 'published' } },
        populate: AUTHOR_POPULATE,
        sort: ['publicationDate:desc'],
        limit: 100,
      });
      return { data: posts.map(publicShape) };
    },

    async findOneBySlug(ctx) {
      const posts = await strapi.documents('api::blog-post.blog-post').findMany({
        filters: {
          slug: { $eq: ctx.params.slug },
          status: { $eq: 'published' },
        },
        populate: AUTHOR_POPULATE,
        limit: 1,
      });
      const post = posts[0];
      if (!post) return ctx.notFound('Blog post not found');
      return { data: publicShape(post) };
    },

    async create(ctx) {
      const input = ctx.request.body?.data ?? {};
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      const body = typeof input.body === 'string' ? input.body.trim() : '';
      if (!title) return ctx.badRequest('title is required');
      if (!body) return ctx.badRequest('body is required');

      let status: BlogStatus;
      let coverImageUrl: string | null | undefined;
      try {
        status = parseStatus(input.status, 'draft');
        coverImageUrl = parseCoverImageUrl(input.coverImageUrl);
      } catch (error) {
        return ctx.badRequest((error as Error).message);
      }

      const slug = normalizeSlug(
        typeof input.slug === 'string' && input.slug.trim() ? input.slug : title,
      );
      if (!slug) return ctx.badRequest('slug is required');
      const duplicate = await strapi.documents('api::blog-post.blog-post').findMany({
        filters: { slug: { $eq: slug } },
        fields: ['documentId'],
        limit: 1,
      });
      if (duplicate.length) return ctx.badRequest('Slug is already in use');

      const created = await strapi.documents('api::blog-post.blog-post').create({
        data: {
          title,
          slug,
          body,
          coverImageUrl: coverImageUrl ?? undefined,
          status,
          publicationDate: status === 'published' ? new Date().toISOString() : undefined,
          author: ctx.state.user.id,
        },
        populate: AUTHOR_POPULATE,
      });
      return { data: managementShape(created) };
    },

    async update(ctx) {
      const documentId = ctx.params.documentId ?? ctx.params.id;
      const current = await strapi.documents('api::blog-post.blog-post').findOne({
        documentId,
        populate: AUTHOR_POPULATE,
      });
      if (!current) return ctx.notFound('Blog post not found');

      const input = ctx.request.body?.data;
      if (!input || typeof input !== 'object') return ctx.badRequest('data is required');
      const data: Record<string, unknown> = {};

      if ('title' in input) {
        const title = typeof input.title === 'string' ? input.title.trim() : '';
        if (!title) return ctx.badRequest('title is required');
        data.title = title;
      }
      if ('body' in input) {
        const body = typeof input.body === 'string' ? input.body.trim() : '';
        if (!body) return ctx.badRequest('body is required');
        data.body = body;
      }
      try {
        const coverImageUrl = parseCoverImageUrl(input.coverImageUrl);
        if (coverImageUrl !== undefined) data.coverImageUrl = coverImageUrl;
        if ('status' in input) {
          const nextStatus = parseStatus(input.status);
          data.status = nextStatus;
          if (nextStatus === 'published' && current.status !== 'published') {
            data.publicationDate = new Date().toISOString();
          }
        }
      } catch (error) {
        return ctx.badRequest((error as Error).message);
      }
      if ('slug' in input) {
        const slug = normalizeSlug(
          typeof input.slug === 'string' ? input.slug.trim() : '',
        );
        if (!slug) return ctx.badRequest('slug is required');
        const duplicates = await strapi.documents('api::blog-post.blog-post').findMany({
          filters: { slug: { $eq: slug } },
          fields: ['documentId'],
          limit: 2,
        });
        if (duplicates.some((post) => post.documentId !== documentId)) {
          return ctx.badRequest('Slug is already in use');
        }
        data.slug = slug;
      }

      if (!Object.keys(data).length) return ctx.badRequest('No editable fields supplied');

      const updated = await strapi.documents('api::blog-post.blog-post').update({
        documentId,
        data,
        populate: AUTHOR_POPULATE,
      });
      return { data: managementShape(updated) };
    },

    async delete(ctx) {
      const deleted = await strapi.documents('api::blog-post.blog-post').delete({
        documentId: ctx.params.documentId ?? ctx.params.id,
      });
      return { data: deleted };
    },

    async mine(ctx) {
      const filters = ctx.state.user.role?.name === 'Admin'
        ? {}
        : { author: { id: { $eq: ctx.state.user.id } } };
      const posts = await strapi.documents('api::blog-post.blog-post').findMany({
        filters,
        populate: AUTHOR_POPULATE,
        sort: ['updatedAt:desc'],
        limit: 10000,
      });
      return { data: posts.map(managementShape) };
    },
  }),
);
