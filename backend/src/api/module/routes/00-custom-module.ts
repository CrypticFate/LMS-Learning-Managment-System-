const staffOnly = {
  name: 'global::has-any-role',
  config: { roles: ['Admin', 'Content Manager', 'Instructor'] },
};

export default {
  routes: [
    {
      method: 'GET',
      path: '/courses/:courseDocumentId/modules',
      handler: 'module.courseModules',
      config: { policies: ['global::can-view-course-lessons'] },
    },
    {
      method: 'POST',
      path: '/courses/:courseDocumentId/modules/:moduleDocumentId',
      handler: 'module.attachCourse',
      config: { policies: [staffOnly] },
    },
    {
      method: 'DELETE',
      path: '/courses/:courseDocumentId/modules/:moduleDocumentId',
      handler: 'module.detachCourse',
      config: { policies: [staffOnly] },
    },
    {
      method: 'POST',
      path: '/modules/:moduleDocumentId/lessons/:lessonDocumentId',
      handler: 'module.attachLesson',
      config: { policies: [staffOnly] },
    },
    {
      method: 'DELETE',
      path: '/modules/:moduleDocumentId/lessons/:lessonDocumentId',
      handler: 'module.detachLesson',
      config: { policies: [staffOnly] },
    },
    {
      method: 'POST',
      path: '/modules/:moduleDocumentId/quizzes/:quizDocumentId',
      handler: 'module.attachQuiz',
      config: { policies: [staffOnly] },
    },
    {
      method: 'DELETE',
      path: '/modules/:moduleDocumentId/quizzes/:quizDocumentId',
      handler: 'module.detachQuiz',
      config: { policies: [staffOnly] },
    },
  ],
};
