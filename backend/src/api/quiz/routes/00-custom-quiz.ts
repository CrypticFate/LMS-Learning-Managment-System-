export default {
  routes: [
    {
      method: 'GET',
      path: '/modules/:moduleDocumentId/quizzes',
      handler: 'quiz.moduleQuizzes',
      config: { policies: ['global::can-view-course-lessons'] },
    },
    {
      method: 'GET',
      path: '/courses/:courseDocumentId/quizzes',
      handler: 'quiz.courseQuizzes',
      config: { policies: ['global::is-enrolled'] },
    },
    {
      method: 'GET',
      path: '/quizzes/:documentId/take',
      handler: 'quiz.take',
      config: { policies: ['global::is-enrolled'] },
    },
    {
      method: 'POST',
      path: '/quizzes/:documentId/submit',
      handler: 'quiz.submit',
      config: { policies: ['global::is-enrolled'] },
    },
    {
      method: 'GET',
      path: '/quizzes/:documentId/attempts',
      handler: 'quiz.attempts',
      config: { policies: ['global::can-manage-quiz'] },
    },
  ],
};
