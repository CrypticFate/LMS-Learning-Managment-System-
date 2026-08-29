export default {
  routes: [
    {
      method: 'GET',
      path: '/courses/mine',
      handler: 'course.mine',
      config: {
        policies: [
          {
            name: 'global::has-any-role',
            config: { roles: ['Admin', 'Content Manager', 'Instructor'] },
          },
        ],
      },
    },
  ],
};
