import { factories } from '@strapi/strapi';

import { relationDocumentId } from '../../../policies/course-access';

export default factories.createCoreController('api::lesson.lesson', ({ strapi }) => ({
  async create(ctx) {
    const courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);
    if (!courseDocumentId) return ctx.badRequest('course is required');

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseDocumentId,
    });
    if (!course) return ctx.notFound('Course not found');
    return super.create(ctx);
  },

  async delete(ctx) {
    const lessonDocumentId = ctx.params.documentId ?? ctx.params.id;
    const completions = lessonDocumentId
      ? await strapi.documents('api::progress.progress').findMany({
          filters: { lesson: { documentId: { $eq: lessonDocumentId } } },
          limit: 10000,
        })
      : [];

    const response = await super.delete(ctx);
    await Promise.all(completions.map((completion) => (
      strapi.documents('api::progress.progress').delete({
        documentId: completion.documentId,
      })
    )));
    return response;
  },

  async courseLessons(ctx) {
    const course = await strapi.documents('api::course.course').findOne({
      documentId: ctx.params.courseDocumentId,
    });
    if (!course) return ctx.notFound('Course not found');

    const lessons = await strapi.documents('api::lesson.lesson').findMany({
      filters: {
        course: { documentId: { $eq: ctx.params.courseDocumentId } },
      },
      sort: ['order:asc', 'createdAt:asc'],
    });
    return { data: lessons };
  },
}));
