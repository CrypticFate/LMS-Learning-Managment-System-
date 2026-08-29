import { factories } from '@strapi/strapi';

import { relationDocumentId } from '../../../policies/course-access';

type ProgressSummary = {
  courseDocumentId: string;
  completed: number;
  totalLessons: number;
  percent: number;
  completedLessonDocumentIds: string[];
};

export async function computeCourseProgress(
  strapi: any,
  studentId: number,
  courseDocumentId: string,
): Promise<ProgressSummary> {
  const [totalLessons, completed, completionRows] = await Promise.all([
    strapi.documents('api::lesson.lesson').count({
      filters: { course: { documentId: { $eq: courseDocumentId } } },
    }),
    strapi.documents('api::progress.progress').count({
      filters: {
        student: { id: { $eq: studentId } },
        course: { documentId: { $eq: courseDocumentId } },
      },
    }),
    strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: { $eq: studentId } },
        course: { documentId: { $eq: courseDocumentId } },
      },
      populate: { lesson: { fields: ['documentId'] } },
      limit: 10000,
    }),
  ]);

  const completedLessonDocumentIds = completionRows
    .map((row: any) => row.lesson?.documentId)
    .filter((documentId: unknown): documentId is string => typeof documentId === 'string');
  const percent = totalLessons === 0
    ? 0
    : Math.round((completed / totalLessons) * 100);

  return {
    courseDocumentId,
    completed,
    totalLessons,
    percent,
    completedLessonDocumentIds,
  };
}

export default factories.createCoreController('api::progress.progress', ({ strapi }) => ({
  async complete(ctx) {
    const user = ctx.state.user;
    const lessonDocumentId = relationDocumentId(ctx.request.body?.data?.lesson);
    if (!lessonDocumentId) return ctx.badRequest('lesson is required');

    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonDocumentId,
      populate: { course: true },
    });
    if (!lesson) return ctx.notFound('Lesson not found');

    const courseDocumentId = (lesson.course as any)?.documentId;
    if (!courseDocumentId) return ctx.badRequest('Lesson is not assigned to a course');

    const existing = await strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: { $eq: user.id } },
        lesson: { documentId: { $eq: lessonDocumentId } },
      },
      limit: 1,
    });
    if (existing.length > 0) return { data: existing[0] };

    const created = await strapi.documents('api::progress.progress').create({
      data: {
        student: user.id,
        lesson: lessonDocumentId,
        course: courseDocumentId,
        completedAt: new Date().toISOString(),
      },
    });
    return { data: created };
  },

  async uncomplete(ctx) {
    const user = ctx.state.user;
    const lessonDocumentId = ctx.params.lessonDocumentId;
    const records = await strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: { $eq: user.id } },
        lesson: { documentId: { $eq: lessonDocumentId } },
      },
      limit: 1,
    });
    if (records.length === 0) return ctx.notFound('Completion not found');

    await strapi.documents('api::progress.progress').delete({
      documentId: records[0].documentId,
    });
    return { data: { ok: true } };
  },

  async courseProgress(ctx) {
    const summary = await computeCourseProgress(
      strapi,
      ctx.state.user.id,
      ctx.params.courseDocumentId,
    );
    return { data: summary };
  },

  async me(ctx) {
    const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: { student: { id: { $eq: ctx.state.user.id } } },
      populate: { course: { fields: ['documentId'] } },
      limit: 10000,
    });
    const summaries = await Promise.all(
      enrollments
        .filter((enrollment: any) => Boolean(enrollment.course?.documentId))
        .map((enrollment: any) => computeCourseProgress(
          strapi,
          ctx.state.user.id,
          enrollment.course.documentId,
        )),
    );
    return { data: summaries };
  },

  async courseStudents(ctx) {
    const courseDocumentId = ctx.params.courseDocumentId;
    const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
      filters: { course: { documentId: { $eq: courseDocumentId } } },
      populate: {
        student: { fields: ['id', 'documentId', 'username', 'email'] },
      },
      sort: ['enrolledAt:asc'],
      limit: 10000,
    });
    const rows = await Promise.all(enrollments.map(async (enrollment: any) => {
      const summary = await computeCourseProgress(strapi, enrollment.student.id, courseDocumentId);
      return {
        student: enrollment.student,
        completed: summary.completed,
        totalLessons: summary.totalLessons,
        percent: summary.percent,
      };
    }));
    return { data: rows };
  },
}));
