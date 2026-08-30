import { canManageAllCourses, findModuleWithCourses } from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const documentId = policyContext.params?.documentId ?? policyContext.params?.id;
  if (!user || !documentId) return false;

  const module = await findModuleWithCourses(strapi, documentId);
  if (!module) return false;

  return canManageAllCourses(user, module.courses ?? []);
};
