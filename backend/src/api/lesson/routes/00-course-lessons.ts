export default {
  routes: [
    {
      method: 'GET',
      path: '/courses/:courseDocumentId/lessons',
      handler: 'lesson.courseLessons',
      config: { policies: ['global::can-view-course-lessons'] },
    },
  ],
};
