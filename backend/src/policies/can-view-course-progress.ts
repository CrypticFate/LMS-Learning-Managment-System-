import { ROLE } from '../constants/roles';
import { canManageLoadedCourse, findCourse } from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const courseDocumentId = policyContext.params?.courseDocumentId;
  if (!user || !courseDocumentId) return false;

  const role = user.role?.name;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true;
  if (role !== ROLE.INSTRUCTOR) return false;

  const course = await findCourse(strapi, courseDocumentId);
  return canManageLoadedCourse(user, course);
};
