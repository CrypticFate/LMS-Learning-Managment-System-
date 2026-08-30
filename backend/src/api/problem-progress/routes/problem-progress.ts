export default {
  routes: [
    {
      method: 'GET',
      path: '/problem-progress/me',
      handler: 'problem-progress.me',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: ['Student'] } }] },
    },
    {
      method: 'POST',
      path: '/problem-progress/attempt',
      handler: 'problem-progress.attempt',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: ['Student'] } }] },
    },
    {
      method: 'POST',
      path: '/problem-progress/complete',
      handler: 'problem-progress.complete',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: ['Student'] } }] },
    },
    {
      method: 'GET',
      path: '/problem-progress/students',
      handler: 'problem-progress.students',
      config: { policies: ['global::is-admin'] },
    },
  ],
};
