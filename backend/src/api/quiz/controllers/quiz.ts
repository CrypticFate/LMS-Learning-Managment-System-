import { factories } from '@strapi/strapi';

import { isRelatedToCourse, relationDocumentId } from '../../../policies/course-access';

type QuizQuestionInput = {
  questionText: string;
  options: string[];
  correctIndex: number;
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
    questions.push({ questionText, options, correctIndex });
  }

  return { title, questions };
}

export default factories.createCoreController('api::quiz.quiz', ({ strapi }) => ({
  async create(ctx) {
    const moduleDocumentId = relationDocumentId(ctx.request.body?.data?.module);
    if (!moduleDocumentId) return ctx.badRequest('module is required');

    const input = parseQuizInput(ctx.request.body?.data);
    if (typeof input === 'string') return ctx.badRequest(input);

    const module = await strapi.documents('api::module.module').findOne({
      documentId: moduleDocumentId,
    });
    if (!module) return ctx.notFound('Module not found');

    const created = await strapi.documents('api::quiz.quiz').create({
      data: {
        ...input,
        modules: { connect: [moduleDocumentId] },
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
    return { data: quiz };
  },

  async update(ctx) {
    const input = parseQuizInput(ctx.request.body?.data);
    if (typeof input === 'string') return ctx.badRequest(input);

    const updated = await strapi.documents('api::quiz.quiz').update({
      documentId: routeDocumentId(ctx),
      data: input,
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

  async take(ctx) {
    const courseDocumentId = relationDocumentId(ctx.request.query?.course);
    if (!courseDocumentId) return ctx.badRequest('course is required');

    const quiz = await strapi.documents('api::quiz.quiz').findOne({
      documentId: ctx.params.documentId,
      populate: {
        questions: true,
        modules: { populate: { courses: { fields: ['documentId'] } } },
      },
    });
    if (!quiz) return ctx.notFound('Quiz not found');
    if (!isRelatedToCourse(quiz, courseDocumentId)) return ctx.notFound('Quiz not found');


    return {
      data: {
        documentId: quiz.documentId,
        courseDocumentId,
        title: quiz.title,
        questions: ((quiz.questions ?? []) as any[]).map((question, index) => ({
          index,
          questionText: question.questionText,
          options: question.options,
        })),
      },
    };
  },

  async submit(ctx) {
    const courseDocumentId = relationDocumentId(ctx.request.body?.data?.course);
    if (!courseDocumentId) return ctx.badRequest('course is required');

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
    if (!isRelatedToCourse(quiz, courseDocumentId)) return ctx.notFound('Quiz not found');

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
        course: courseDocumentId,
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
