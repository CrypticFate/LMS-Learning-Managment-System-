export default {
  routes: [
    {
      method: 'GET',
      path: '/quiz-attempts/me',
      handler: 'quiz-attempt.me',
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
