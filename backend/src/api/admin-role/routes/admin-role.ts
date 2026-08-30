export default {
  routes: [
    {
      method: 'GET',
      path: '/admin/users',
      handler: 'admin-role.listUsers',
      config: { policies: ['global::is-admin'] },
    },
    {
      method: 'PUT',
      path: '/admin/users/:id/role',
      handler: 'admin-role.updateRole',
      config: { policies: ['global::is-admin'] },
    },
    {
      method: 'GET',
      path: '/admin/stats',
      handler: 'admin-role.stats',
      config: { policies: ['global::is-admin'] },
    },
  ],
};
