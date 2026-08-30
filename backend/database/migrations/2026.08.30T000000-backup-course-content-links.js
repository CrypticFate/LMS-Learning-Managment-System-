'use strict';

const BACKUP_TABLE = 'legacy_course_content_links';

async function copyLinks(knex, sourceTable, kind, childColumn) {
  if (!(await knex.schema.hasTable(sourceTable))) return;

  const columns = await knex(sourceTable).columnInfo();
  if (!columns[childColumn] || !columns.course_id) return;

  const rows = await knex(sourceTable).select(childColumn, 'course_id');
  const links = rows
    .filter((row) => row[childColumn] != null && row.course_id != null)
    .map((row) => ({
      kind,
      child_id: row[childColumn],
      course_id: row.course_id,
    }));
  if (links.length === 0) return;

  await knex(BACKUP_TABLE)
    .insert(links)
    .onConflict(['kind', 'child_id', 'course_id'])
    .ignore();
}

async function up(knex) {
  if (!(await knex.schema.hasTable(BACKUP_TABLE))) {
    await knex.schema.createTable(BACKUP_TABLE, (table) => {
      table.increments('id').primary();
      table.string('kind').notNullable();
      table.integer('child_id').notNullable();
      table.integer('course_id').notNullable();
      table.unique(['kind', 'child_id', 'course_id']);
    });
  }

  await copyLinks(knex, 'lessons_course_lnk', 'lesson', 'lesson_id');
  await copyLinks(knex, 'quizzes_course_lnk', 'quiz', 'quiz_id');
}

async function down(knex) {
  await knex.schema.dropTableIfExists(BACKUP_TABLE);
}

module.exports = { up, down };
