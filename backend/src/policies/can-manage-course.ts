import { ROLE } from '../constants/roles';
import {
  canManageLoadedCourse,
  findCourse,
  relationDocumentId,
} from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  if (!user) return false;

  const role = user.role?.name;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true;
  if (role !== ROLE.INSTRUCTOR) return false;

  const isCourseRoute = policyContext.request.path?.startsWith('/api/courses/');
  const documentId = isCourseRoute
    ? policyContext.params?.documentId ?? policyContext.params?.id
    : relationDocumentId(policyContext.request.body?.data?.course);
  if (!documentId) return false;

  const course = await findCourse(strapi, documentId);
  return canManageLoadedCourse(user, course);
};
