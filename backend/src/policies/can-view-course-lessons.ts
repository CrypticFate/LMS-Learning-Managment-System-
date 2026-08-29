import { ROLE } from '../constants/roles';
import {
  canManageLoadedCourse,
  findCourse,
  hasEnrollment,
} from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const courseDocumentId = policyContext.params?.courseDocumentId;
  if (!user || !courseDocumentId) return false;

  if (user.role?.name === ROLE.STUDENT) {
    return hasEnrollment(strapi, user.id, courseDocumentId);
  }

  const course = await findCourse(strapi, courseDocumentId);
  return canManageLoadedCourse(user, course);
};
