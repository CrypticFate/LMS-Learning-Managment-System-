import { factories } from '@strapi/strapi';

import { ROLE } from '../../../constants/roles';
import { canManageAnyCourse, relatedCourses } from '../../../policies/course-access';

export default factories.createCoreController('api::comment.comment', ({ strapi }) => ({
  async create(ctx) {
    const lessonDocumentId = ctx.request.body?.data?.lesson;
    if (!lessonDocumentId) return ctx.badRequest('lesson is required');

    const body = ctx.request.body?.data?.body;
    if (!body || typeof body !== 'string' || !body.trim()) {
      return ctx.badRequest('Comment body is required');
    }

    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonDocumentId,
    });
    if (!lesson) return ctx.notFound('Lesson not found');

    const created = await strapi.documents('api::comment.comment').create({
      data: {
        body: body.trim(),
        author: ctx.state.user.id,
        lesson: lessonDocumentId,
      },
      populate: {
        author: { fields: ['id', 'documentId', 'username'] },
      },
    });
    return { data: created };
  },

  async delete(ctx) {
    const documentId = ctx.params.documentId ?? ctx.params.id;
    const comment = await strapi.documents('api::comment.comment').findOne({
      documentId,
      populate: {
        author: { fields: ['id'] },
        lesson: {
          populate: {
            modules: {
              populate: {
                courses: { populate: { owner: true } },
              },
            },
          },
        },
      },
    });
    if (!comment) return ctx.notFound('Comment not found');

    const user = ctx.state.user;
    const role = user.role?.name;
    const canModerate = role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER || canManageAnyCourse(
      user,
      relatedCourses(comment.lesson),
    );
    if (!canModerate && comment.author?.id !== user.id) {
      return ctx.forbidden('You can only delete your own comments');
    }

    const deleted = await strapi.documents('api::comment.comment').delete({
      documentId,
    });
    return { data: deleted };
  },

  async lessonComments(ctx) {
    const lessonDocumentId = ctx.params.lessonDocumentId;
    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonDocumentId,
    });
    if (!lesson) return ctx.notFound('Lesson not found');

    const comments = await strapi.documents('api::comment.comment').findMany({
      filters: {
        lesson: { documentId: { $eq: lessonDocumentId } },
      },
      populate: {
        author: { fields: ['id', 'documentId', 'username'] },
      },
      sort: ['createdAt:asc'],
      limit: 10000,
    });
    return { data: comments };
  },
}));
