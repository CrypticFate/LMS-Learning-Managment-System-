import { factories } from '@strapi/strapi';

function relationDocumentId(value: unknown): string | undefined {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'documentId' in value) {
    const documentId = (value as { documentId?: unknown }).documentId;
    return typeof documentId === 'string' ? documentId : undefined;
  }
  return undefined;
}

async function findProblem(strapi: any, documentId: string) {
  return strapi.documents('api::problem-set.problem-set').findOne({ documentId });
}

async function findProgress(strapi: any, studentId: number, problemDocumentId: string) {
  const rows = await strapi.documents('api::problem-progress.problem-progress').findMany({
    filters: {
      student: { id: { $eq: studentId } },
      problemSet: { documentId: { $eq: problemDocumentId } },
    },
    populate: { problemSet: { fields: ['documentId'] } },
    limit: 1,
  });
  return rows[0] ?? null;
}

async function totalProblemCount(strapi: any) {
  return strapi.documents('api::problem-set.problem-set').count({});
}

async function summaryForStudent(strapi: any, student: any) {
  const [total, rows] = await Promise.all([
    totalProblemCount(strapi),
    strapi.documents('api::problem-progress.problem-progress').findMany({
      filters: { student: { id: { $eq: student.id } } },
      populate: { problemSet: { fields: ['documentId'] } },
      limit: 10000,
    }),
  ]);
  const attemptedProblemIds = new Set<string>();
  const completedProblemIds = new Set<string>();
  for (const row of rows as any[]) {
    const documentId = row.problemSet?.documentId;
    if (!documentId) continue;
    attemptedProblemIds.add(documentId);
    if (row.completedAt) completedProblemIds.add(documentId);
  }
  return {
    student,
    attempted: attemptedProblemIds.size,
    completed: completedProblemIds.size,
    totalProblems: total,
    percent: total === 0 ? 0 : Math.round((completedProblemIds.size / total) * 100),
  };
}

export default factories.createCoreController('api::problem-progress.problem-progress', ({ strapi }) => ({
  async me(ctx) {
    const summary = await summaryForStudent(strapi, {
      id: ctx.state.user.id,
      documentId: ctx.state.user.documentId,
      username: ctx.state.user.username,
      email: ctx.state.user.email,
    });
    const rows = await strapi.documents('api::problem-progress.problem-progress').findMany({
      filters: { student: { id: { $eq: ctx.state.user.id } } },
      populate: { problemSet: { fields: ['documentId', 'title', 'category', 'difficulty'] } },
      sort: ['completedAt:desc', 'attemptedAt:desc'],
      limit: 10000,
    });
    return { data: { ...summary, records: rows } };
  },

  async attempt(ctx) {
    const problemDocumentId = relationDocumentId(ctx.request.body?.data?.problemSet);
    if (!problemDocumentId) return ctx.badRequest('problemSet is required');
    const problem = await findProblem(strapi, problemDocumentId);
    if (!problem) return ctx.notFound('Problem set not found');

    const existing = await findProgress(strapi, ctx.state.user.id, problemDocumentId);
    if (existing) return { data: existing };

    const created = await strapi.documents('api::problem-progress.problem-progress').create({
      data: {
        student: ctx.state.user.id,
        problemSet: problemDocumentId,
        attemptedAt: new Date().toISOString(),
      },
    });
    return { data: created };
  },

  async complete(ctx) {
    const problemDocumentId = relationDocumentId(ctx.request.body?.data?.problemSet);
    if (!problemDocumentId) return ctx.badRequest('problemSet is required');
    const problem = await findProblem(strapi, problemDocumentId);
    if (!problem) return ctx.notFound('Problem set not found');

    const existing = await findProgress(strapi, ctx.state.user.id, problemDocumentId);
    const now = new Date().toISOString();
    if (existing) {
      if (existing.completedAt) return { data: existing };
      const updated = await strapi.documents('api::problem-progress.problem-progress').update({
        documentId: existing.documentId,
        data: ({ completedAt: now } as any),
      });
      return { data: updated };
    }

    const created = await strapi.documents('api::problem-progress.problem-progress').create({
      data: {
        student: ctx.state.user.id,
        problemSet: problemDocumentId,
        attemptedAt: now,
        completedAt: now,
      },
    });
    return { data: created };
  },

  async students(ctx) {
    const studentRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { name: 'Student' },
    });
    const students = await strapi.db.query('plugin::users-permissions.user').findMany({
      where: studentRole ? { role: studentRole.id } : {},
      orderBy: { username: 'asc' },
    });
    const summaries = await Promise.all(students.map((student: any) => summaryForStudent(strapi, {
      id: student.id,
      documentId: student.documentId,
      username: student.username,
      email: student.email,
    })));
    return { data: summaries };
  },
}));
