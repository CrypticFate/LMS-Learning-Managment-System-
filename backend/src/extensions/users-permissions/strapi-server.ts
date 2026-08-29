export default (plugin: any) => {
  plugin.controllers.user.me = async (ctx: any) => {
    const authenticatedUser = ctx.state.user;
    if (!authenticatedUser) return ctx.unauthorized('Authentication required');

    const user = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({
        where: { id: authenticatedUser.id },
        populate: { role: true },
      });
    if (!user) return ctx.unauthorized('Authentication required');

    ctx.body = {
      id: user.id,
      documentId: user.documentId,
      username: user.username,
      email: user.email,
      confirmed: user.confirmed,
      blocked: user.blocked,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            type: user.role.type,
          }
        : null,
    };
  };

  return plugin;
};
