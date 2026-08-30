import { factories } from '@strapi/strapi';

function documentId(ctx: any): string {
  return ctx.params.documentId ?? ctx.params.id;
}

function blogInput(data: any) {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  const excerpt = typeof data?.excerpt === 'string' ? data.excerpt.trim() : '';
  const content = typeof data?.content === 'string' ? data.content.trim() : '';
  if (!title) return 'title is required';
  if (!content) return 'content is required';
  return { title, excerpt: excerpt || null, content };
}

function slugFromTitle(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'post';
  return `${base}-${Date.now().toString(36)}`;
}

export default factories.createCoreController(
  'api::blog-post.blog-post',
  ({ strapi }) => ({
    async create(ctx) {
      const input = blogInput(ctx.request.body?.data);
      if (typeof input === 'string') return ctx.badRequest(input);

      const created = await strapi.documents('api::blog-post.blog-post').create({
        status: 'draft',
        data: {
          ...input,
          slug: slugFromTitle(input.title),
          author: ctx.state.user.id,
        },
        populate: { author: { fields: ['id', 'documentId', 'username'] } },
      });
      return { data: created };
    },

    async update(ctx) {
      const input = blogInput(ctx.request.body?.data);
      if (typeof input === 'string') return ctx.badRequest(input);

      const updated = await strapi.documents('api::blog-post.blog-post').update({
        documentId: documentId(ctx),
        data: input,
        populate: { author: { fields: ['id', 'documentId', 'username'] } },
      });
      return { data: updated };
    },

    async delete(ctx) {
      const deleted = await strapi.documents('api::blog-post.blog-post').delete({
        documentId: documentId(ctx),
      });
      return { data: deleted };
    },

    async publish(ctx) {
      const published = await strapi.documents('api::blog-post.blog-post').publish({
        documentId: documentId(ctx),
      });
      return { data: published };
    },

    async unpublish(ctx) {
      const unpublished = await strapi.documents('api::blog-post.blog-post').unpublish({
        documentId: documentId(ctx),
      });
      return { data: unpublished };
    },
  }),
);
