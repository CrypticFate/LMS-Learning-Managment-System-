import { ROLE } from '../constants/roles';
import { hasEnrollment, relationDocumentId } from './course-access';

export default async (policyContext: any, _config: unknown, { strapi }: any) => {
  const user = policyContext.state.user;
  if (user?.role?.name !== ROLE.STUDENT) return false;

  let courseDocumentId =
    policyContext.params?.courseDocumentId ??
    relationDocumentId(policyContext.request.body?.data?.course);

  // A lesson always determines its own course. Never trust a client-supplied
  // course when authorizing completion of that lesson.
  const lessonDocumentId =
    policyContext.params?.lessonDocumentId ??
    relationDocumentId(policyContext.request.body?.data?.lesson);

  if (lessonDocumentId) {
    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonDocumentId,
      populate: { course: { fields: ['documentId'] } },
    });
    courseDocumentId = (lesson?.course as any)?.documentId;
  }

  // Quiz routes are authorized against the quiz's stored course. A supplied
  // course id must never grant access to a quiz from another course.
  const quizDocumentId = policyContext.request.path?.startsWith('/api/quizzes/')
    ? policyContext.params?.documentId
    : undefined;
  if (quizDocumentId) {
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: quizDocumentId,
      populate: { course: { fields: ['documentId'] } },
    });
    courseDocumentId = (quiz?.course as any)?.documentId;
  }

  if (!courseDocumentId) return false;

  return hasEnrollment(strapi, user.id, courseDocumentId);
};
