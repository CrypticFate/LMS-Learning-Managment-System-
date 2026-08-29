import { factories } from '@strapi/strapi';

import { ROLE } from '../../../constants/roles';

export default factories.createCoreController('api::course.course', ({ strapi }) => ({
  async find(ctx) {
    ctx.query = { ...ctx.query, populate: undefined };
    return super.find(ctx);
  },

  async findOne(ctx) {
    ctx.query = { ...ctx.query, populate: undefined };
    return super.findOne(ctx);
  },

  async create(ctx) {
    const input = await this.sanitizeInput!(ctx.request.body?.data ?? {}, ctx);
    const { owner: _ignoredOwner, ...safeInput } = input as Record<string, unknown>;
    const created = await strapi.documents('api::course.course').create({
      data: {
        ...safeInput,
        owner: ctx.state.user.documentId ?? ctx.state.user.id,
      } as any,
    });
    const sanitized = await this.sanitizeOutput!(created, ctx);
    return this.transformResponse!(sanitized);
  },

  async mine(ctx) {
    const user = ctx.state.user;
    const role = user.role?.name;
    const filters = role === ROLE.INSTRUCTOR
      ? { owner: { id: { $eq: user.id } } }
      : {};

    const courses = await strapi.documents('api::course.course').findMany({
      filters,
      sort: ['createdAt:desc'],
      populate: {
        owner: { fields: ['id', 'documentId', 'username'] },
      },
    });
    return { data: courses };
  },
}));
