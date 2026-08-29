export default {
  routes: [
    {
      method: 'GET',
      path: '/enrollments/me',
      handler: 'enrollment.me',
      config: {
        policies: [
          {
            name: 'global::has-any-role',
            config: { roles: ['Student'] },
          },
        ],
      },
    },
  ],
};
