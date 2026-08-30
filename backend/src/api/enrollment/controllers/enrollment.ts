import { factories } from '@strapi/strapi';

import { relationDocumentId } from '../../../policies/course-access';

export default factories.createCoreController('api::enrollment.enrollment', ({ strapi }) => ({
  async create(ctx) {
    const user = ctx.state.user;
    const courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);
    if (!courseDocumentId) return ctx.badRequest('course is required');

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseDocumentId,
    });
    if (!course) return ctx.notFound('Course not found');

    const duplicate = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: {
        student: { id: { $eq: user.id } },
        course: { documentId: { $eq: courseDocumentId } },
      },
      limit: 1,
    });
    if (duplicate.length > 0) return ctx.conflict('Already enrolled');

    const created = await strapi.documents('api::enrollment.enrollment').create({
      data: {
        student: user.id,
        course: courseDocumentId,
        enrolledAt: new Date().toISOString(),
      },
      populate: { course: true },
    });
    return { data: created };
  },

  async me(ctx) {
    const rows = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: { student: { id: { $eq: ctx.state.user.id } } },
      sort: ['enrolledAt:desc'],
      populate: {
        course: {
          populate: {
            modules: {
              sort: ['order:asc', 'createdAt:asc'],
              populate: {
                lessons: { sort: ['order:asc', 'createdAt:asc'] },
              },
            },
          },
        },
      },
    });
    return { data: rows.filter((row) => Boolean((row as any).course)) };
  },
}));
