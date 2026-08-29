import { canManageLoadedCourse } from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const documentId = policyContext.params?.documentId ?? policyContext.params?.id;
  if (!user || !documentId) return false;

  const quiz = await strapi.documents('api::quiz.quiz').findOne({
    documentId,
    populate: { course: { populate: { owner: true } } },
  });
  return canManageLoadedCourse(user, quiz?.course);
};
