export default {
  routes: [
    {
      method: 'GET',
      path: '/modules/:moduleDocumentId/lessons',
      handler: 'lesson.moduleLessons',
      config: { policies: ['global::can-view-course-lessons'] },
    },
  ],
};
