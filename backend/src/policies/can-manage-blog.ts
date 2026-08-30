import { ROLE } from '../constants/roles';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const documentId = policyContext.params?.documentId ?? policyContext.params?.id;
  if (!user || !documentId) return false;

  if (user.role?.name === ROLE.ADMIN) return true;
  if (user.role?.name !== ROLE.CONTENT_MANAGER) return false;

  const blog = await strapi.documents('api::blog-post.blog-post').findOne({
    documentId,
    populate: { author: true },
  });

  return Boolean(
    blog?.author &&
      ((blog.author.documentId &&
        blog.author.documentId === user.documentId) ||
        blog.author.id === user.id),
  );
};
