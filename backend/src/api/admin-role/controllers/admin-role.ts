import { ROLE } from '../../../constants/roles';

const ALLOWED_ROLES = Object.values(ROLE);

export default {
  async updateRole(ctx: any) {
    const userId = Number(ctx.params.id);
    const requested = ctx.request.body?.data?.role ?? ctx.request.body?.role;
    if (!Number.isInteger(userId)) return ctx.badRequest('Invalid user id');
    if (!ALLOWED_ROLES.includes(requested)) return ctx.badRequest('Invalid role');

    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { name: requested } });
    if (!role) return ctx.notFound('Role not found');

    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: userId } });
    if (!user) return ctx.notFound('User not found');

    const updated = await strapi.db
      .query('plugin::users-permissions.user')
      .update({ where: { id: userId }, data: { role: role.id } });

    return {
      data: {
        id: updated.id,
        documentId: updated.documentId,
        username: updated.username,
        email: updated.email,
        role: { id: role.id, name: role.name, type: role.type },
      },
    };
  },
};
