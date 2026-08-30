import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::module.module', {
  only: ['create', 'update', 'delete'],
  config: {
    create: { policies: ['global::can-manage-course'] },
    update: { policies: ['global::can-manage-module'] },
    delete: { policies: ['global::can-manage-module'] },
  },
});
