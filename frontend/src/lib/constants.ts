export const ROLE = {
  ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE];

export const AUTH_COOKIE = 'lms_jwt';

export const DASHBOARD_ROUTE_BY_ROLE: Record<RoleName, string> = {
  [ROLE.ADMIN]: '/admin',
  [ROLE.CONTENT_MANAGER]: '/content-manager',
  [ROLE.INSTRUCTOR]: '/instructor',
  [ROLE.STUDENT]: '/student',
};
