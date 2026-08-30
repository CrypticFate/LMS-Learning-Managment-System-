import { ROLE } from '../constants/roles';
import {
  canManageAnyCourse,
  hasEnrollment,
  relatedCourses,
} from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  const lessonDocumentId =
    policyContext.params?.lessonDocumentId ??
    policyContext.request.body?.data?.lesson;
  if (!user || typeof lessonDocumentId !== 'string') return false;

  const lesson = await strapi.documents('api::lesson.lesson').findOne({
    documentId: lessonDocumentId,
    populate: {
      modules: {
        populate: {
          courses: { populate: { owner: true } },
        },
      },
    },
  });
  if (!lesson) return false;

  const courses = relatedCourses(lesson);
  if (user.role?.name === ROLE.STUDENT) {
    for (const course of courses) {
      if (await hasEnrollment(strapi, user.id, course.documentId)) return true;
    }
    return false;
  }
  return canManageAnyCourse(user, courses);
};
