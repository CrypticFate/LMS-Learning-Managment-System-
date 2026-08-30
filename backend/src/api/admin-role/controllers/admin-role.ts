import { ROLE } from '../../../constants/roles';

const ALLOWED_ROLES = Object.values(ROLE);

export default {
  async listUsers(ctx: any) {
    const users = await strapi.db
      .query('plugin::users-permissions.user')
      .findMany({
        populate: { role: true },
        orderBy: { createdAt: 'desc' },
      });

    ctx.body = {
      data: users.map((user: any) => ({
        id: user.id,
        documentId: user.documentId,
        username: user.username,
        email: user.email,
        role: user.role
          ? { id: user.role.id, name: user.role.name, type: user.role.type }
          : null,
      })),
    };
  },

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
      .findOne({ where: { id: userId }, populate: { role: true } });
    if (!user) return ctx.notFound('User not found');

    if (user.role?.name === ROLE.ADMIN && requested !== ROLE.ADMIN) {
      const adminRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { name: ROLE.ADMIN } });
      const adminCount = adminRole
        ? await strapi.db
            .query('plugin::users-permissions.user')
            .count({ where: { role: adminRole.id } })
        : 0;
      if (adminCount <= 1) {
        return ctx.badRequest('Cannot demote the last remaining Admin');
      }
    }

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

  async stats(ctx: any) {
    const roles = await strapi.db
      .query('plugin::users-permissions.role')
      .findMany();
    const usersByRole: Record<string, number> = {};
    for (const role of roles) {
      usersByRole[role.name] = await strapi.db
        .query('plugin::users-permissions.user')
        .count({ where: { role: role.id } });
    }

    const [totalUsers, totalCourses, totalEnrollments, totalBlogPosts] =
      await Promise.all([
        strapi.db.query('plugin::users-permissions.user').count(),
        strapi.documents('api::course.course').count({}),
        strapi.documents('api::enrollment.enrollment').count({}),
        strapi.documents('api::blog-post.blog-post').count({}),
      ]);

    ctx.body = {
      data: {
        totalUsers,
        usersByRole,
        totalCourses,
        totalEnrollments,
        totalBlogPosts,
      },
    };
  },
};
