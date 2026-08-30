import { ROLE } from '../constants/roles';
import {
  canManageAnyCourse,
  canManageLoadedCourse,
  findCourse,
  findModuleWithCourses,
  hasEnrollment,
  hasEnrollmentInAnyModuleCourse,
} from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  if (!user) return false;

  // Course-level route: /courses/:courseDocumentId/modules
  const courseDocumentId = policyContext.params?.courseDocumentId;
  if (courseDocumentId) {
    if (user.role?.name === ROLE.STUDENT) {
      return hasEnrollment(strapi, user.id, courseDocumentId);
    }
    const course = await findCourse(strapi, courseDocumentId);
    return canManageLoadedCourse(user, course);
  }

  // Module-level route: /modules/:moduleDocumentId/lessons
  const moduleDocumentId = policyContext.params?.moduleDocumentId;
  if (moduleDocumentId) {
    const module = await findModuleWithCourses(strapi, moduleDocumentId);
    if (!module) return false;

    if (user.role?.name === ROLE.STUDENT) {
      return hasEnrollmentInAnyModuleCourse(strapi, user.id, module);
    }
    return canManageAnyCourse(user, module.courses ?? []);
  }

  return false;
};
