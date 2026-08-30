import { factories } from '@strapi/strapi';

const DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

function routeDocumentId(ctx: any): string {
  return ctx.params.documentId ?? ctx.params.id;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizedProblemSet(data: any) {
  const title = text(data?.title);
  const category = text(data?.category);
  const problemUrl = text(data?.problemUrl);
  const difficulty = text(data?.difficulty) || 'medium';
  const rawOrder = Number(data?.order ?? 0);

  if (!title) return 'title is required';
  if (!category) return 'category is required';
  if (!DIFFICULTIES.has(difficulty)) return 'difficulty must be easy, medium, or hard';
  if (!Number.isInteger(rawOrder) || rawOrder < 0) return 'order must be a non-negative integer';

  try {
    const url = new URL(problemUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    return 'problemUrl must be a valid http(s) URL';
  }

  return {
    title,
    slug: text(data?.slug) || undefined,
    category,
    difficulty,
    problemUrl,
    description: text(data?.description),
    order: rawOrder,
  };
}

function serializeProblem(problem: any, progress?: any) {
  return {
    id: problem.id,
    documentId: problem.documentId,
    title: problem.title,
    slug: problem.slug,
    category: problem.category,
    difficulty: problem.difficulty,
    problemUrl: problem.problemUrl,
    description: problem.description,
    order: problem.order,
    attemptedAt: progress?.attemptedAt ?? null,
    completedAt: progress?.completedAt ?? null,
    progressDocumentId: progress?.documentId ?? null,
  };
}

async function progressMapForStudent(strapi: any, studentId: number) {
  const rows = await strapi.documents('api::problem-progress.problem-progress').findMany({
    filters: { student: { id: { $eq: studentId } } },
    populate: { problemSet: { fields: ['documentId'] } },
    limit: 10000,
  });
  return new Map(rows.map((row: any) => [row.problemSet?.documentId, row]));
}

async function removeProblemProgress(strapi: any, problemDocumentId: string) {
  const rows = await strapi.documents('api::problem-progress.problem-progress').findMany({
    filters: { problemSet: { documentId: { $eq: problemDocumentId } } },
    limit: 10000,
  });
  await Promise.all(rows.map((row: any) => (
    strapi.documents('api::problem-progress.problem-progress').delete({ documentId: row.documentId })
  )));
}

export default factories.createCoreController('api::problem-set.problem-set', ({ strapi }) => ({
  async find(ctx) {
    const problems = await strapi.documents('api::problem-set.problem-set').findMany({
      sort: ['category:asc', 'order:asc', 'title:asc'],
      limit: 10000,
    });
    const progressByProblem = ctx.state.user?.role?.name === 'Student'
      ? await progressMapForStudent(strapi, ctx.state.user.id)
      : new Map();

    return {
      data: problems.map((problem: any) => serializeProblem(
        problem,
        progressByProblem.get(problem.documentId),
      )),
    };
  },

  async findOne(ctx) {
    const problem = await strapi.documents('api::problem-set.problem-set').findOne({
      documentId: routeDocumentId(ctx),
    });
    if (!problem) return ctx.notFound('Problem set not found');

    let progress: any = null;
    if (ctx.state.user?.role?.name === 'Student') {
      const rows = await strapi.documents('api::problem-progress.problem-progress').findMany({
        filters: {
          student: { id: { $eq: ctx.state.user.id } },
          problemSet: { documentId: { $eq: problem.documentId } },
        },
        limit: 1,
      });
      progress = rows[0] ?? null;
    }
    return { data: serializeProblem(problem, progress) };
  },

  async create(ctx) {
    const input = normalizedProblemSet(ctx.request.body?.data);
    if (typeof input === 'string') return ctx.badRequest(input);
    const created = await strapi.documents('api::problem-set.problem-set').create({ data: input as any });
    return { data: serializeProblem(created) };
  },

  async update(ctx) {
    const input = normalizedProblemSet(ctx.request.body?.data);
    if (typeof input === 'string') return ctx.badRequest(input);
    const updated = await strapi.documents('api::problem-set.problem-set').update({
      documentId: routeDocumentId(ctx),
      data: input as any,
    });
    return { data: serializeProblem(updated) };
  },

  async delete(ctx) {
    const documentId = routeDocumentId(ctx);
    await removeProblemProgress(strapi, documentId);
    const deleted = await strapi.documents('api::problem-set.problem-set').delete({ documentId });
    return { data: deleted };
  },

  async adminProgress(ctx) {
    const rows = await strapi.documents('api::problem-progress.problem-progress').findMany({
      populate: {
        student: { fields: ['id', 'documentId', 'username', 'email'] },
        problemSet: { fields: ['documentId', 'title', 'category', 'difficulty'] },
      },
      sort: ['completedAt:desc', 'attemptedAt:desc'],
      limit: 10000,
    });
    return { data: rows };
  },
}));
