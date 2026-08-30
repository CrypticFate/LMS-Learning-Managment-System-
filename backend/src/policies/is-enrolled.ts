import { ROLE } from '../constants/roles';
import { hasEnrollment, hasEnrollmentInAnyModuleCourse, relationDocumentId } from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  if (user?.role?.name !== ROLE.STUDENT) return false;

  // Direct course enrollment check (e.g. for /courses/:courseDocumentId/modules)
  let courseDocumentId =
    policyContext.params?.courseDocumentId ??
    relationDocumentId(policyContext.request.body?.data?.course) ??
    relationDocumentId(policyContext.request.query?.course);

  if (courseDocumentId) {
    return hasEnrollment(strapi, user.id, courseDocumentId);
  }

  // Module-based route: check if enrolled in any parent course
  const moduleDocumentId =
    policyContext.params?.moduleDocumentId ??
    relationDocumentId(policyContext.request.body?.data?.module);

  if (moduleDocumentId) {
    const module = await strapi.documents('api::module.module').findOne({
      documentId: moduleDocumentId,
      populate: { courses: { fields: ['documentId'] } },
    });
    return hasEnrollmentInAnyModuleCourse(strapi, user.id, module);
  }

  // Lesson-based route: find modules → courses
  const lessonDocumentId =
    policyContext.params?.lessonDocumentId ??
    relationDocumentId(policyContext.request.body?.data?.lesson);

  if (lessonDocumentId) {
    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonDocumentId,
      populate: { modules: { populate: { courses: { fields: ['documentId'] } } } },
    });
    const courses = (lesson?.modules ?? []).flatMap((m: any) => m.courses ?? []);
    for (const course of courses) {
      if (await hasEnrollment(strapi, user.id, course.documentId)) return true;
    }
    return false;
  }

  // Quiz-based route: find modules → courses
  const quizDocumentId = policyContext.request.path?.startsWith('/api/quizzes/')
    ? policyContext.params?.documentId
    : undefined;
  if (quizDocumentId) {
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: quizDocumentId,
      populate: { modules: { populate: { courses: { fields: ['documentId'] } } } },
    });
    const courses = (quiz?.modules ?? []).flatMap((m: any) => m.courses ?? []);
    for (const course of courses) {
      if (await hasEnrollment(strapi, user.id, course.documentId)) return true;
    }
    return false;
  }

  return false;
};
