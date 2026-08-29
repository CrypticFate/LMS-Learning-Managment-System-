export default {
  routes: [
    {
      method: 'POST',
      path: '/progress/complete',
      handler: 'progress.complete',
      config: { policies: ['global::is-enrolled'] },
    },
    {
      method: 'DELETE',
      path: '/progress/complete/:lessonDocumentId',
      handler: 'progress.uncomplete',
      config: { policies: ['global::is-enrolled'] },
    },
    {
      method: 'GET',
      path: '/progress/course/:courseDocumentId',
      handler: 'progress.courseProgress',
      config: {
        policies: [
          {
            name: 'global::has-any-role',
            config: { roles: ['Student'] },
          },
          'global::is-enrolled',
        ],
      },
    },
    {
      method: 'GET',
      path: '/progress/me',
      handler: 'progress.me',
      config: {
        policies: [
          {
            name: 'global::has-any-role',
            config: { roles: ['Student'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/courses/:courseDocumentId/progress',
      handler: 'progress.courseStudents',
      config: { policies: ['global::can-view-course-progress'] },
    },
  ],
};
