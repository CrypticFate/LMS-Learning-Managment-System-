import { factories } from '@strapi/strapi';

import {
  canManageAllCourses,
  canManageLoadedCourse,
  findCourse,
  findModuleWithCourses,
  relatedCourses,
  relationDocumentId,
} from '../../../policies/course-access';

function documentData<T extends Record<string, unknown>>(data: T) {
  return data as any;
}

export default factories.createCoreController('api::module.module', ({ strapi }) => ({
  async create(ctx) {
    const courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);
    if (!courseDocumentId) return ctx.badRequest('course is required');

    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseDocumentId,
    });
    if (!course) return ctx.notFound('Course not found');

    const data = ctx.request.body?.data ?? {};
    const created = await strapi.documents('api::module.module').create({
      data: documentData({
        title: data.title,
        description: data.description ?? null,
        order: data.order ?? 0,
        courses: { connect: [courseDocumentId] },
      }),
      populate: { courses: { fields: ['documentId', 'title'] } },
    });
    return { data: created };
  },

  async update(ctx) {
    const documentId = ctx.params.documentId ?? ctx.params.id;
    const data = ctx.request.body?.data ?? {};
    const updated = await strapi.documents('api::module.module').update({
      documentId,
      data: documentData({
        title: data.title,
        description: data.description,
        order: data.order,
      }),
    });
    return { data: updated };
  },

  async delete(ctx) {
    const documentId = ctx.params.documentId ?? ctx.params.id;
    const deleted = await strapi.documents('api::module.module').delete({
      documentId,
    });
    return { data: deleted };
  },

  async attachCourse(ctx) {
    const { courseDocumentId, moduleDocumentId } = ctx.params;
    const [course, module] = await Promise.all([
      findCourse(strapi, courseDocumentId),
      findModuleWithCourses(strapi, moduleDocumentId),
    ]);
    if (!course || !module) return ctx.notFound('Course or module not found');
    if (
      !canManageLoadedCourse(ctx.state.user, course) ||
      !canManageAllCourses(ctx.state.user, module.courses ?? [])
    ) {
      return ctx.forbidden('You cannot share this module with that course');
    }

    const updated = await strapi.documents('api::module.module').update({
      documentId: moduleDocumentId,
      data: documentData({ courses: { connect: [courseDocumentId] } }),
    });
    return { data: updated };
  },

  async detachCourse(ctx) {
    const { courseDocumentId, moduleDocumentId } = ctx.params;
    const [course, module] = await Promise.all([
      findCourse(strapi, courseDocumentId),
      findModuleWithCourses(strapi, moduleDocumentId),
    ]);
    if (!course || !module) return ctx.notFound('Course or module not found');
    if (!canManageLoadedCourse(ctx.state.user, course)) {
      return ctx.forbidden('You cannot remove this module from that course');
    }
    if (!(module.courses ?? []).some((item: any) => item.documentId === courseDocumentId)) {
      return ctx.notFound('Module is not assigned to this course');
    }
    if ((module.courses ?? []).length <= 1) {
      return ctx.badRequest('A module must remain assigned to at least one course');
    }

    const updated = await strapi.documents('api::module.module').update({
      documentId: moduleDocumentId,
      data: documentData({ courses: { disconnect: [courseDocumentId] } }),
    });
    return { data: updated };
  },

  async attachLesson(ctx) {
    const { moduleDocumentId, lessonDocumentId } = ctx.params;
    const [module, lesson] = await Promise.all([
      findModuleWithCourses(strapi, moduleDocumentId),
      strapi.documents('api::lesson.lesson').findOne({
        documentId: lessonDocumentId,
        populate: { modules: { populate: { courses: { populate: { owner: true } } } } },
      }),
    ]);
    if (!module || !lesson) return ctx.notFound('Module or lesson not found');
    const lessonCourses = relatedCourses(lesson);
    if (
      !canManageAllCourses(ctx.state.user, module.courses ?? []) ||
      (lessonCourses.length > 0 && !canManageAllCourses(ctx.state.user, lessonCourses))
    ) {
      return ctx.forbidden('You cannot share this lesson with that module');
    }

    const updated = await strapi.documents('api::lesson.lesson').update({
      documentId: lessonDocumentId,
      data: documentData({ modules: { connect: [moduleDocumentId] } }),
    });
    return { data: updated };
  },

  async detachLesson(ctx) {
    const { moduleDocumentId, lessonDocumentId } = ctx.params;
    const [module, lesson] = await Promise.all([
      findModuleWithCourses(strapi, moduleDocumentId),
      strapi.documents('api::lesson.lesson').findOne({
        documentId: lessonDocumentId,
        populate: { modules: { fields: ['documentId'] } },
      }),
    ]);
    if (!module || !lesson) return ctx.notFound('Module or lesson not found');
    if (!canManageAllCourses(ctx.state.user, module.courses ?? [])) {
      return ctx.forbidden('You cannot change this module');
    }
    if ((lesson.modules ?? []).length <= 1) {
      return ctx.badRequest('A lesson must remain assigned to at least one module');
    }

    const updated = await strapi.documents('api::lesson.lesson').update({
      documentId: lessonDocumentId,
      data: documentData({ modules: { disconnect: [moduleDocumentId] } }),
    });
    return { data: updated };
  },

  async attachQuiz(ctx) {
    const { moduleDocumentId, quizDocumentId } = ctx.params;
    const [module, quiz] = await Promise.all([
      findModuleWithCourses(strapi, moduleDocumentId),
      strapi.documents('api::quiz.quiz').findOne({
        documentId: quizDocumentId,
        populate: { modules: { populate: { courses: { populate: { owner: true } } } } },
      }),
    ]);
    if (!module || !quiz) return ctx.notFound('Module or quiz not found');
    const quizCourses = relatedCourses(quiz);
    if (
      !canManageAllCourses(ctx.state.user, module.courses ?? []) ||
      (quizCourses.length > 0 && !canManageAllCourses(ctx.state.user, quizCourses))
    ) {
      return ctx.forbidden('You cannot share this quiz with that module');
    }

    const updated = await strapi.documents('api::quiz.quiz').update({
      documentId: quizDocumentId,
      data: documentData({ modules: { connect: [moduleDocumentId] } }),
    });
    return { data: updated };
  },

  async detachQuiz(ctx) {
    const { moduleDocumentId, quizDocumentId } = ctx.params;
    const [module, quiz] = await Promise.all([
      findModuleWithCourses(strapi, moduleDocumentId),
      strapi.documents('api::quiz.quiz').findOne({
        documentId: quizDocumentId,
        populate: { modules: { populate: { courses: { populate: { owner: true } } } } },
      }),
    ]);
    if (!module || !quiz) return ctx.notFound('Module or quiz not found');
    if (!(quiz.modules ?? []).some((item: any) => item.documentId === moduleDocumentId)) {
      return ctx.notFound('Quiz is not assigned to this module');
    }

    const quizCourses = relatedCourses(quiz);
    if (
      !canManageAllCourses(ctx.state.user, module.courses ?? []) ||
      (quizCourses.length > 0 && !canManageAllCourses(ctx.state.user, quizCourses))
    ) {
      return ctx.forbidden('You cannot remove this quiz from that module');
    }

    if ((quiz.modules ?? []).length <= 1) {
      const attempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
        filters: { quiz: { documentId: { $eq: quizDocumentId } } },
        limit: 10000,
      });
      await Promise.all(attempts.map((attempt: any) => (
        strapi.documents('api::quiz-attempt.quiz-attempt').delete({
          documentId: attempt.documentId,
        })
      )));
      const deleted = await strapi.documents('api::quiz.quiz').delete({
        documentId: quizDocumentId,
      });
      return { data: deleted, meta: { removed: 'deleted' } };
    }

    const updated = await strapi.documents('api::quiz.quiz').update({
      documentId: quizDocumentId,
      data: documentData({ modules: { disconnect: [moduleDocumentId] } }),
    });
    return { data: updated, meta: { removed: 'detached' } };
  },

  async courseModules(ctx) {
    const courseDocumentId = ctx.params.courseDocumentId;
    const course = await strapi.documents('api::course.course').findOne({
      documentId: courseDocumentId,
    });
    if (!course) return ctx.notFound('Course not found');

    const modules = await strapi.documents('api::module.module').findMany({
      filters: {
        courses: { documentId: { $eq: courseDocumentId } },
      },
      sort: ['order:asc', 'createdAt:asc'],
      populate: {
        courses: { fields: ['documentId', 'title'] },
        lessons: { fields: ['documentId', 'title', 'order'] },
        quizzes: { fields: ['documentId', 'title'] },
      },
    });
    return { data: modules };
  },
}));
