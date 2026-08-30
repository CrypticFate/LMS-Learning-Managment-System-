import { factories } from '@strapi/strapi';

import { isRelatedToCourse, relatedCourses, relationDocumentId } from '../../../policies/course-access';

type QuizQuestionInput = {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

type QuizInput = {
  title: string;
  questions: QuizQuestionInput[];
};

function routeDocumentId(ctx: any): string {
  return ctx.params.documentId ?? ctx.params.id;
}

function parseQuizInput(data: any): QuizInput | string {
  const title = typeof data?.title === 'string' ? data.title.trim() : '';
  if (!title) return 'title is required';
  if (!Array.isArray(data?.questions) || data.questions.length === 0) {
    return 'At least one question is required';
  }

  const questions: QuizQuestionInput[] = [];
  for (let index = 0; index < data.questions.length; index += 1) {
    const raw = data.questions[index];
    const questionText = typeof raw?.questionText === 'string' ? raw.questionText.trim() : '';
    if (!questionText) return `Question ${index + 1} text is required`;
    if (!Array.isArray(raw?.options) || raw.options.length < 2 || raw.options.length > 6) {
      return `Question ${index + 1} must have between 2 and 6 options`;
    }

    const options = raw.options.map((option: unknown) => (
      typeof option === 'string' ? option.trim() : ''
    ));
    if (options.some((option: string) => !option)) {
      return `Question ${index + 1} options cannot be empty`;
    }

    const correctIndex = Number(raw.correctIndex);
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      return `Question ${index + 1} has an invalid correct answer`;
    }

    const explanation = typeof raw?.explanation === 'string' ? raw.explanation.trim() : '';
    questions.push({ questionText, options, correctIndex, explanation });
  }

  return { title, questions };
}

function withPrimaryCourse(quiz: any) {
  const courses = relatedCourses(quiz);
  return { ...quiz, course: courses[0] ?? null };
}

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  async create(ctx) {
    let moduleDocumentId = relationDocumentId(ctx.request.body?.data?.module);
    const courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);
    if (!moduleDocumentId && !courseDocumentId) {
      return ctx.badRequest('module or course is required');
    }

    const input = parseQuizInput(ctx.request.body?.data);
    if (typeof input === 'string') return ctx.badRequest(input);

    if (!moduleDocumentId && courseDocumentId) {
      const course = await strapi.documents('api::course.course').findOne({
        documentId: courseDocumentId,
      });
      if (!course) return ctx.notFound('Course not found');

      const existingModules = await strapi.documents('api::module.module').findMany({
        filters: { courses: { documentId: { $eq: courseDocumentId } } },
        sort: ['order:asc', 'createdAt:asc'],
        limit: 1,
      });
      const targetModule = existingModules[0] ?? await strapi.documents('api::module.module').create({
        data: {
          title: 'Quizzes',
          description: 'Auto-created module for course quizzes.',
          order: 0,
          courses: { connect: [courseDocumentId] },
        },
      });
      moduleDocumentId = targetModule.documentId;
    }

    if (!moduleDocumentId) return ctx.badRequest('module or course is required');
    const resolvedModuleDocumentId = moduleDocumentId;

    const module = await strapi.documents('api::module.module').findOne({
      documentId: resolvedModuleDocumentId,
    });
    if (!module) return ctx.notFound('Module not found');

    const created = await strapi.documents('api::quiz.quiz').create({
      data: {
        ...input,
        modules: { connect: [resolvedModuleDocumentId] },
      },
      populate: { questions: true },
    });
    return { data: created };
  },

  async findOne(ctx) {
    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: routeDocumentId(ctx),
      populate: {
        questions: true,
        modules: {
          fields: ['documentId', 'title'],
          populate: { courses: { fields: ['documentId', 'title'] } },
        },
      },
    });
    if (!quiz) return ctx.notFound('Quiz not found');
    return { data: withPrimaryCourse(quiz) };
  },

  async update(ctx) {
    const input = parseQuizInput(ctx.request.body?.data);
    if (typeof input === 'string') return ctx.badRequest(input);

    const updated = await strapi.documents('api::quiz.quiz').update({
      documentId: routeDocumentId(ctx),
      data: input as any,
      populate: { questions: true },
    });
    return { data: updated };
  },

  async delete(ctx) {
    const documentId = routeDocumentId(ctx);
    const attempts = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
      filters: { quiz: { documentId: { $eq: documentId } } },
      limit: 10000,
    });
    await Promise.all(attempts.map((attempt) => (
      strapi.documents('api::quiz-attempt.quiz-attempt').delete({
        documentId: attempt.documentId,
      })
    )));
    const deleted = await strapi.documents('api::quiz.quiz').delete({
      documentId,
    });
    return { data: deleted };
  },

  async moduleQuizzes(ctx) {
    const quizzes = await strapi.documents('api::quiz.quiz').findMany({
      filters: { modules: { documentId: { $eq: ctx.params.moduleDocumentId } } },
      populate: { questions: true },
      sort: ['createdAt:asc'],
      limit: 10000,
    });
    return {
      data: quizzes.map((quiz: any) => ({
        documentId: quiz.documentId,
        title: quiz.title,
        questionCount: quiz.questions?.length ?? 0,
      })),
    };
  },


  async courseQuizzes(ctx) {
    const courseDocumentId = ctx.params.courseDocumentId;
    const quizzes = await strapi.documents('api::quiz.quiz').findMany({
      filters: { modules: { courses: { documentId: { $eq: courseDocumentId } } } },
      populate: { questions: true },
      sort: ['createdAt:asc'],
      limit: 10000,
    });
    return {
      data: quizzes.map((quiz: any) => ({
        documentId: quiz.documentId,
        title: quiz.title,
        questionCount: quiz.questions?.length ?? 0,
      })),
    };
  },

  async take(ctx) {
    let courseDocumentId = relationDocumentId(ctx.request.query?.course);

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.documentId,
      populate: {
        questions: true,
        modules: { populate: { courses: { fields: ['documentId'] } } },
      },
    });
    if (!quiz) return ctx.notFound('Quiz not found');

    if (!courseDocumentId) {
      const courses = relatedCourses(quiz);
      if (courses.length !== 1) return ctx.badRequest('course is required');
      courseDocumentId = courses[0].documentId;
    }
    if (!courseDocumentId) return ctx.badRequest('course is required');
    const resolvedCourseDocumentId = courseDocumentId;
    if (!isRelatedToCourse(quiz, resolvedCourseDocumentId)) return ctx.notFound('Quiz not found');

    return {
      data: {
        documentId: quiz.documentId,
        courseDocumentId: resolvedCourseDocumentId,
        title: quiz.title,
        questions: ((quiz.questions ?? []) as any[]).map((question, index) => ({
          index,
          questionText: question.questionText,
          options: question.options,
        })),
      },
    };
  },

  async solution(ctx) {
    const attemptDocumentId = relationDocumentId(ctx.request.query?.attempt);
    if (!attemptDocumentId) return ctx.badRequest('attempt is required');

    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').findOne({
      documentId: attemptDocumentId,
      populate: { quiz: { populate: { questions: true } }, student: { fields: ['id'] } },
    });
    if (!attempt || attempt.student?.id !== ctx.state.user.id) return ctx.notFound('Attempt not found');

    const quiz = attempt.quiz as any;
    if (!quiz || quiz.documentId !== ctx.params.documentId) return ctx.notFound('Attempt not found');

    return {
      data: {
        attemptDocumentId: attempt.documentId,
        questions: ((quiz.questions ?? []) as any[]).map((question, index) => ({
          index,
          explanation: question.explanation ?? '',
        })),
      },
    };
  },

  async submit(ctx) {
    let courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);

    const answers = ctx.request.body?.data?.answers;
    if (!Array.isArray(answers)) return ctx.badRequest('answers must be an array');

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.documentId,
      populate: {
        questions: true,
        modules: { populate: { courses: { fields: ['documentId'] } } },
      },
    });
    if (!quiz) return ctx.notFound('Quiz not found');

    if (!courseDocumentId) {
      const courses = relatedCourses(quiz);
      if (courses.length !== 1) return ctx.badRequest('course is required');
      courseDocumentId = courses[0].documentId;
    }
    if (!courseDocumentId) return ctx.badRequest('course is required');
    const resolvedCourseDocumentId = courseDocumentId;
    if (!isRelatedToCourse(quiz, resolvedCourseDocumentId)) return ctx.notFound('Quiz not found');

    const questions = (quiz.questions ?? []) as any[];
    if (questions.length === 0) return ctx.badRequest('Quiz has no questions');
    if (answers.length !== questions.length) {
      return ctx.badRequest('Answer count does not match question count');
    }

    const normalizedAnswers: number[] = [];
    for (let index = 0; index < answers.length; index += 1) {
      const answer = Number(answers[index]);
      const options = Array.isArray(questions[index].options) ? questions[index].options : [];
      if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) {
        return ctx.badRequest(`Answer ${index + 1} is out of range`);
      }
      normalizedAnswers.push(answer);
    }

    let score = 0;
    questions.forEach((question, index) => {
      if (normalizedAnswers[index] === Number(question.correctIndex)) score += 1;
    });
    const total = questions.length;


    const attempt = await strapi.documents('api::quiz-attempt.quiz-attempt').create({
      data: {
        student: ctx.state.user.id,
        quiz: quiz.documentId,
        course: resolvedCourseDocumentId,
        answers: normalizedAnswers,
        score,
        total,
        submittedAt: new Date().toISOString(),
      },
    });

    return {
      data: {
        score,
        total,
        percent: Math.round((score / total) * 100),
        attemptDocumentId: attempt.documentId,
        explanations: questions.map((question, index) => ({
          index,
          explanation: question.explanation ?? '',
        })),
      },
    };
  },

  async attempts(ctx) {
    const rows = await strapi.documents('api::quiz-attempt.quiz-attempt').findMany({
      filters: { quiz: { documentId: { $eq: ctx.params.documentId } } },
      populate: { student: { fields: ['id', 'documentId', 'username'] } },
      sort: ['submittedAt:desc'],
      limit: 10000,
    });
    return {
      data: rows.map((attempt: any) => ({
        documentId: attempt.documentId,
        student: {
          id: attempt.student?.id,
          documentId: attempt.student?.documentId,
          username: attempt.student?.username,
        },
        score: attempt.score,
        total: attempt.total,
        percent: attempt.total === 0 ? 0 : Math.round((attempt.score / attempt.total) * 100),
        submittedAt: attempt.submittedAt,
      })),
    };
  },
}));
