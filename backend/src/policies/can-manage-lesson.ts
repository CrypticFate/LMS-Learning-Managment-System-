import { canManageAllCourses, relatedCourses } from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const documentId = policyContext.params?.documentId ?? policyContext.params?.id;
  if (!user || !documentId) return false;

  const lesson = await strapi.documents('api::lesson.lesson').findOne({
    documentId,
    populate: { modules: { populate: { courses: { populate: { owner: true } } } } },
  });
  if (!lesson) return false;

  return canManageAllCourses(user, relatedCourses(lesson));
};
