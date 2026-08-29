import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::quiz-attempt.quiz-attempt', ({ strapi }) => ({
  async me(ctx) {
    const rows = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
      filters: { student: { id: { $eq: ctx.state.user.id } } },
      populate: {
        quiz: { fields: ['documentId', 'title'] },
        course: { fields: ['documentId', 'title'] },
      },
      sort: ['submittedAt:desc'],
      limit: 10000,
    });
    return { data: rows };
  },
}));
