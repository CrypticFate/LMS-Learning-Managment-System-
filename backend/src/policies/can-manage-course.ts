import { ROLE } from '../constants/roles';
import {
  canManageAllCourses,
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

  // Course route (update/delete course itself)
  const isCourseRoute = policyContext.request.path?.startsWith('/api/courses/');
  if (isCourseRoute) {
    const documentId = policyContext.params?.documentId ?? policyContext.params?.id;
    if (!documentId) return false;
    const course = await findCourse(strapi, documentId);
    return canManageLoadedCourse(user, course);
  }

  // Module creation: body.data.course is the target course
  const courseDocId = relationDocumentId(policyContext.request.body?.data?.course);
  if (courseDocId) {
    const course = await findCourse(strapi, courseDocId);
    return canManageLoadedCourse(user, course);
  }

  // Lesson/quiz creation: body.data.module is the target module
  const moduleDocId = relationDocumentId(policyContext.request.body?.data?.module);
  if (moduleDocId) {
    const module = await strapi.documents('api::module.module').findOne({
      documentId: moduleDocId,
      populate: { courses: { populate: { owner: true } } },
    });
    return canManageAllCourses(user, module?.courses ?? []);
  }

  return false;
};
