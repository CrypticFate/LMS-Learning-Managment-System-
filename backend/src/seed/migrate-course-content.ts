import type { Core } from '@strapi/strapi';

const BACKUP_TABLE = 'legacy_course_content_links';
const MIGRATED_MODULE_TITLE = 'Migrated course content';

type LegacyLink = {
  kind: 'lesson' | 'quiz';
  child_id: number;
  course_id: number;
};

export async function migrateCourseContentRelations(
  strapi: Core.Strapi,
): Promise<void> {
  const knex = (strapi.db as any).connection;
  if (!(await knex.schema.hasTable(BACKUP_TABLE))) return;

  const links = (await knex(BACKUP_TABLE)
    .select(['kind', 'child_id', 'course_id'])
    .orderBy(['course_id', 'kind', 'child_id'])) as LegacyLink[];
  if (links.length === 0) {
    await knex.schema.dropTable(BACKUP_TABLE);
    return;
  }

  const courseIds = [...new Set(links.map((link: LegacyLink) => link.course_id))];
  const courses = await knex('courses')
    .select(['id', 'document_id'])
    .whereIn('id', courseIds);
  const courseDocumentIds = new Map<number, string>(
    courses.map((course: any) => [course.id, course.document_id]),
  );

  for (const courseId of courseIds) {
    const courseDocumentId = courseDocumentIds.get(courseId);
    if (!courseDocumentId) continue;

    const existing = await strapi.documents('api::module.module').findMany({
      filters: {
        courses: { documentId: { $eq: courseDocumentId } },
        title: { $eq: MIGRATED_MODULE_TITLE },
      },
      limit: 1,
    });
    const module = existing[0] ?? await strapi.documents('api::module.module').create({
      data: {
        title: MIGRATED_MODULE_TITLE,
        description: 'Content migrated from the previous course-to-lesson structure.',
        order: 0,
        courses: { connect: [courseDocumentId] },
      },
    });

    const courseLinks = links.filter((link: LegacyLink) => link.course_id === courseId);
    for (const kind of ['lesson', 'quiz'] as const) {
      const ids = courseLinks
        .filter((link: LegacyLink) => link.kind === kind)
        .map((link: LegacyLink) => link.child_id);
      if (ids.length === 0) continue;

      const table = kind === 'lesson' ? 'lessons' : 'quizzes';
      const rows = await knex(table)
        .select(['id', 'document_id'])
        .whereIn('id', ids);
      const uid = kind === 'lesson' ? 'api::lesson.lesson' : 'api::quiz.quiz';
      for (const row of rows) {
        await strapi.documents(uid).update({
          documentId: row.document_id,
          data: { modules: { connect: [module.documentId] } },
        } as any);
      }
    }
  }

  await knex.schema.dropTable(BACKUP_TABLE);
}

export { MIGRATED_MODULE_TITLE };
