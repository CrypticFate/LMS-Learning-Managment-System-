import { factories } from '@strapi/strapi';

import { relationDocumentId } from '../../../policies/course-access';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
  async create(ctx) {
    const moduleDocumentId = relationDocumentId(ctx.request.body?.data?.module);
    if (!moduleDocumentId) return ctx.badRequest('module is required');

    const module = await strapi.documents('api::module.module').findOne({
      documentId: moduleDocumentId,
    });
    if (!module) return ctx.notFound('Module not found');

    const data = ctx.request.body?.data ?? {};
    const created = await strapi.documents('api::lesson.lesson').create({
      data: {
        title: data.title,
        content: data.content ?? null,
        videoUrl: data.videoUrl ?? null,
        order: data.order ?? 0,
        modules: { connect: [moduleDocumentId] },
      },
    });
    return { data: created };
  },

  async delete(ctx) {
    const lessonDocumentId = ctx.params.documentId ?? ctx.params.id;
    const completions = lessonDocumentId
      ? await strapi.documents('api::progress.progress').findMany({
          filters: { lesson: { documentId: { $eq: lessonDocumentId } } },
          limit: 10000,
        })
      : [];

    // Also delete comments
    const comments = lessonDocumentId
      ? await strapi.documents('api::comment.comment').findMany({
          filters: { lesson: { documentId: { $eq: lessonDocumentId } } },
          limit: 10000,
        })
      : [];

    const response = await super.delete(ctx);
    await Promise.all([
      ...completions.map((completion) =>
        strapi.documents('api::progress.progress').delete({
          documentId: completion.documentId,
        })
      ),
      ...comments.map((comment) =>
        strapi.documents('api::comment.comment').delete({
          documentId: comment.documentId,
        })
      ),
    ]);
    return response;
  },

  async moduleLessons(ctx) {
    const moduleDocumentId = ctx.params.moduleDocumentId;
    const module = await strapi.documents('api::module.module').findOne({
      documentId: moduleDocumentId,
    });
    if (!module) return ctx.notFound('Module not found');

    const lessons = await strapi.documents('api::lesson.lesson').findMany({
      filters: {
        modules: { documentId: { $eq: moduleDocumentId } },
      },
      sort: ['order:asc', 'createdAt:asc'],
      populate: { modules: { fields: ['documentId', 'title'] } },
    });
    return { data: lessons };
  },
}));
