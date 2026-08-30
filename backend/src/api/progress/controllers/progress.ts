import { factories } from '@strapi/strapi';

import { isRelatedToCourse, relationDocumentId } from '../../../policies/course-access';

type ProgressSummary = {
  courseDocumentId: string;
  completed: number;
  totalLessons: number;
  percent: number;
  completedLessonDocumentIds: string[];
};

/**
 * Count total lessons across all modules of a course.
 */
async function countCourseLessons(strapi: any, courseDocumentId: string): Promise<number> {
  const modules = await strapi.documents('api::module.module').findMany({
    filters: { courses: { documentId: { $eq: courseDocumentId } } },
    populate: { lessons: { fields: ['documentId'] } },
    limit: 10000,
  });
  const lessonIds = new Set<string>();
  for (const module of modules) {
    for (const lesson of (module.lessons ?? [])) {
      lessonIds.add(lesson.documentId);
    }
  }
  return lessonIds.size;
}

export async function computeCourseProgress(
  strapi: any,
  studentId: number,
  courseDocumentId: string,
): Promise<ProgressSummary> {
  const [totalLessons, completionRows] = await Promise.all([
    countCourseLessons(strapi, courseDocumentId),
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
  const completed = completedLessonDocumentIds.length;
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
    const courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);
    if (!lessonDocumentId) return ctx.badRequest('lesson is required');
    if (!courseDocumentId) return ctx.badRequest('course is required');

    const lesson = await strapi.documents('api::lesson.lesson').findOne({
      documentId: lessonDocumentId,
      populate: { modules: { populate: { courses: { fields: ['documentId'] } } } },
    });
    if (!lesson) return ctx.notFound('Lesson not found');
    if (!isRelatedToCourse(lesson, courseDocumentId)) {
      return ctx.badRequest('Lesson is not assigned to this course');
    }

    const existing = await strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: { $eq: user.id } },
        lesson: { documentId: { $eq: lessonDocumentId } },
        course: { documentId: { $eq: courseDocumentId } },
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
    const courseDocumentId = relationDocumentId(ctx.request.query?.course);
    if (!courseDocumentId) return ctx.badRequest('course is required');

    const records = await strapi.documents('api::progress.progress').findMany({
      filters: {
        student: { id: { $eq: user.id } },
        lesson: { documentId: { $eq: lessonDocumentId } },
        course: { documentId: { $eq: courseDocumentId } },
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
