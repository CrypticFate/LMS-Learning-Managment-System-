export default {
  routes: [
    {
      method: 'PUT',
      path: '/admin/users/:id/role',
      handler: 'admin-role.updateRole',
      config: { policies: ['global::is-admin'] },
    },
  ],
};
