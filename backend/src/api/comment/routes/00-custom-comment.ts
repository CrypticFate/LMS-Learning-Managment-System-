export default {
  routes: [
    {
      method: 'GET',
      path: '/lessons/:lessonDocumentId/comments',
      handler: 'comment.lessonComments',
      config: { policies: ['global::can-access-lesson'] },
    },
  ],
};
