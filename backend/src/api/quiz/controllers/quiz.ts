import { factories } from '@strapi/strapi';

import { relationDocumentId } from '../../../policies/course-access';

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  async create(ctx) {
    const courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);
    if (!courseDocumentId) return ctx.badRequest('course is required');

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseDocumentId,
    });
    if (!course) return ctx.notFound('Course not found');
    return super.create(ctx);
  },
}));
