import type { Core } from '@strapi/strapi';

import { ROLE, type RoleName } from './constants/roles';
import { seedDemoContent } from './seed/demo-content';

type UsersPermissionsRole = {
  id: number;
  name: string;
  type: string;
};

const APP_ROLES = [
  ROLE.ADMIN,
  ROLE.CONTENT_MANAGER,
  ROLE.INSTRUCTOR,
  ROLE.STUDENT,
] as const;

const DEMO_USERS: Array<{
  email: string;
  username: string;
  role: RoleName;
}> = [
  { email: 'admin@lms.test', username: 'admin', role: ROLE.ADMIN },
  { email: 'manager@lms.test', username: 'manager', role: ROLE.CONTENT_MANAGER },
  { email: 'instructor@lms.test', username: 'instructor', role: ROLE.INSTRUCTOR },
  { email: 'student@lms.test', username: 'student', role: ROLE.STUDENT },
];

const SHARED_AUTHENTICATED_ACTIONS = [
  'plugin::users-permissions.user.me',
  'api::course.course.find',
  'api::course.course.findOne',
  'api::course.course.create',
  'api::course.course.update',
  'api::course.course.delete',
  'api::course.course.mine',
  'api::lesson.lesson.create',
  'api::lesson.lesson.update',
  'api::lesson.lesson.delete',
  'api::lesson.lesson.courseLessons',
  'api::enrollment.enrollment.create',
  'api::enrollment.enrollment.me',
  'api::progress.progress.complete',
  'api::progress.progress.uncomplete',
  'api::progress.progress.courseProgress',
  'api::progress.progress.me',
  'api::progress.progress.courseStudents',
  'api::quiz.quiz.create',
  'api::quiz.quiz.findOne',
  'api::quiz.quiz.update',
  'api::quiz.quiz.delete',
  'api::quiz.quiz.courseQuizzes',
  'api::quiz.quiz.take',
  'api::quiz.quiz.submit',
  'api::quiz.quiz.attempts',
  'api::quiz-attempt.quiz-attempt.me',
  'api::blog-post.blog-post.find',
  'api::blog-post.blog-post.findOneBySlug',
  'api::blog-post.blog-post.mine',
  'api::blog-post.blog-post.create',
  'api::blog-post.blog-post.update',
  'api::blog-post.blog-post.delete',
  'api::admin-role.admin-role.listUsers',
  'api::admin-role.admin-role.updateRole',
  'api::admin-role.admin-role.stats',
];

async function enablePermission(
  strapi: Core.Strapi,
  roleId: number,
  action: string,
) {
  const permissions = strapi.db.query('plugin::users-permissions.permission');
  const existing = await permissions.findOne({ where: { action, role: roleId } });

  if (!existing) {
    await permissions.create({ data: { action, role: roleId, enabled: true } });
    return;
  }

  if (!existing.enabled) {
    await permissions.update({
      where: { id: existing.id },
      data: { enabled: true },
    });
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    const roleQuery = strapi.db.query('plugin::users-permissions.role');
    const existing = (await roleQuery.findMany()) as UsersPermissionsRole[];
    const rolesByName = new Map(existing.map((role) => [role.name, role]));

    for (const name of APP_ROLES) {
      if (rolesByName.has(name)) continue;

      const created = (await roleQuery.create({
        data: {
          name,
          description: `${name} role`,
          type: name.toLowerCase().replace(/\s+/g, '_'),
        },
      })) as UsersPermissionsRole;
      rolesByName.set(name, created);
    }

    const studentRole = rolesByName.get(ROLE.STUDENT);
    if (!studentRole) throw new Error('Student role bootstrap failed.');

    const advancedStore = strapi.store({
      type: 'plugin',
      name: 'users-permissions',
      key: 'advanced',
    });
    const advanced = (await advancedStore.get()) as Record<string, unknown> | null;
    await advancedStore.set({
      value: { ...(advanced ?? {}), default_role: studentRole.type },
    });

    for (const seed of DEMO_USERS) {
      const found = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: seed.email } });
      if (found) continue;

      const role = rolesByName.get(seed.role);
      if (!role) throw new Error(`Missing role for ${seed.email}.`);

      await strapi.plugin('users-permissions').service('user').add({
        email: seed.email,
        username: seed.username,
        password: 'Passw0rd!',
        confirmed: true,
        blocked: false,
        role: role.id,
        provider: 'local',
      });
    }

    await seedDemoContent(strapi);

    const publicRole = existing.find((role) => role.type === 'public');
    if (publicRole) {
      await enablePermission(strapi, publicRole.id, 'api::course.course.find');
      await enablePermission(strapi, publicRole.id, 'api::course.course.findOne');
      await enablePermission(strapi, publicRole.id, 'api::enrollment.enrollment.me');
      await enablePermission(strapi, publicRole.id, 'api::blog-post.blog-post.find');
      await enablePermission(
        strapi,
        publicRole.id,
        'api::blog-post.blog-post.findOneBySlug',
      );
    }

    for (const roleName of APP_ROLES) {
      const role = rolesByName.get(roleName);
      if (!role) continue;
      for (const action of SHARED_AUTHENTICATED_ACTIONS) {
        await enablePermission(strapi, role.id, action);
      }
    }
  },
};
