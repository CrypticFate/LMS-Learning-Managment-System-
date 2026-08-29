import { errors } from '@strapi/utils';

export default (
  policyContext: any,
  config: { roles?: string[] },
) => {
  const user = policyContext.state.user;
  if (!user) throw new errors.UnauthorizedError('Authentication required');
  return (config.roles ?? []).includes(user.role?.name);
};
