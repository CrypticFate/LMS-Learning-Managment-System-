import { ROLE } from '../constants/roles';

export default (policyContext: any) =>
  policyContext.state.user?.role?.name === ROLE.ADMIN;
