const PROFILE_ATTRIBUTES = {
  codeforcesHandle: { type: 'string' },
  vjudgeHandle: { type: 'string' },
  discordHandle: { type: 'string' },
  codechefHandle: { type: 'string' },
};

const SAFE_PROFILE_FIELDS = [
  'username',
  'email',
  'codeforcesHandle',
  'vjudgeHandle',
  'discordHandle',
  'codechefHandle',
] as const;

function sanitizeProfileField(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function publicUser(user: any) {
  return {
    id: user.id,
    documentId: user.documentId,
    username: user.username,
    email: user.email,
    codeforcesHandle: user.codeforcesHandle ?? null,
    vjudgeHandle: user.vjudgeHandle ?? null,
    discordHandle: user.discordHandle ?? null,
    codechefHandle: user.codechefHandle ?? null,
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
}

export default (plugin: any) => {
  Object.assign(plugin.contentTypes.user.schema.attributes, PROFILE_ATTRIBUTES);

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

    ctx.body = publicUser(user);
  };

  plugin.controllers.user.updateMe = async (ctx: any) => {
    const authenticatedUser = ctx.state.user;
    if (!authenticatedUser) return ctx.unauthorized('Authentication required');

    const data = ctx.request.body?.data ?? ctx.request.body ?? {};
    const username = sanitizeProfileField(data.username);
    const email = sanitizeProfileField(data.email).toLowerCase();
    const codeforcesHandle = sanitizeProfileField(data.codeforcesHandle);
    const vjudgeHandle = sanitizeProfileField(data.vjudgeHandle);
    const discordHandle = sanitizeProfileField(data.discordHandle);
    const codechefHandle = sanitizeProfileField(data.codechefHandle);

    if (!username || !email) {
      return ctx.badRequest('Username and email are required');
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return ctx.badRequest('A valid email is required');
    }

    for (const field of SAFE_PROFILE_FIELDS) {
      const value = field === 'email' ? email : username;
      const duplicate = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { [field]: value } });
      if (duplicate && duplicate.id !== authenticatedUser.id) {
        return ctx.badRequest(`${field === 'email' ? 'Email' : 'Username'} is already in use`);
      }
    }

    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: authenticatedUser.id },
      data: {
        username,
        email,
        codeforcesHandle: codeforcesHandle || null,
        vjudgeHandle: vjudgeHandle || null,
        discordHandle: discordHandle || null,
        codechefHandle: codechefHandle || null,
      },
    });

    const updated = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({
        where: { id: authenticatedUser.id },
        populate: { role: true },
      });

    ctx.body = publicUser(updated);
  };

  plugin.routes['content-api'].routes.push({
    method: 'PUT',
    path: '/users/me/profile',
    handler: 'user.updateMe',
    config: {
      prefix: '',
    },
  });

  return plugin;
};
