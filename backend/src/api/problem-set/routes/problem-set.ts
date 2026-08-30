import { ROLE } from '../../../constants/roles';

const staffRoles = [ROLE.ADMIN, ROLE.CONTENT_MANAGER, ROLE.INSTRUCTOR];
const allRoles = [...staffRoles, ROLE.STUDENT];

export default {
  routes: [
    {
      method: 'GET',
      path: '/problem-sets/admin/progress',
      handler: 'problem-set.adminProgress',
      config: { policies: ['global::is-admin'] },
    },
    {
      method: 'GET',
      path: '/problem-sets',
      handler: 'problem-set.find',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: allRoles } }] },
    },
    {
      method: 'GET',
      path: '/problem-sets/:documentId',
      handler: 'problem-set.findOne',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: allRoles } }] },
    },
    {
      method: 'POST',
      path: '/problem-sets',
      handler: 'problem-set.create',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: staffRoles } }] },
    },
    {
      method: 'PUT',
      path: '/problem-sets/:documentId',
      handler: 'problem-set.update',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: staffRoles } }] },
    },
    {
      method: 'DELETE',
      path: '/problem-sets/:documentId',
      handler: 'problem-set.delete',
      config: { policies: [{ name: 'global::has-any-role', config: { roles: staffRoles } }] },
    },
  ],
};
