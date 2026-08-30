import { ROLE } from '../constants/roles';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const documentId = policyContext.params?.documentId ?? policyContext.params?.id;
  if (!user || !documentId) return false;

  if ([ROLE.ADMIN, ROLE.CONTENT_MANAGER].includes(user.role?.name)) return true;
  if (user.role?.name !== ROLE.INSTRUCTOR) return false;

  const blog =
    (await strapi.documents('api::blog-post.blog-post').findOne({
      documentId,
      status: 'draft',
      populate: { author: true },
    })) ??
    (await strapi.documents('api::blog-post.blog-post').findOne({
      documentId,
      status: 'published',
      populate: { author: true },
    }));

  return Boolean(
    blog?.author &&
      ((blog.author.documentId &&
        blog.author.documentId === user.documentId) ||
        blog.author.id === user.id),
  );
};
