import { canManageAllCourses, relatedCourses } from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const documentId = policyContext.params?.documentId ?? policyContext.params?.id;
  if (!user || !documentId) return false;

  const quiz = await strapi.documents('api::quiz.quiz').findOne({
    documentId,
    populate: { modules: { populate: { courses: { populate: { owner: true } } } } },
  });
  if (!quiz) return false;

  return canManageAllCourses(user, relatedCourses(quiz));
};
