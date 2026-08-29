export const ROLE = {
  ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager',
  INSTRUCTOR: 'Instructor',
  STUDENT: 'Student',
} as const;

export type RoleName = (typeof ROLE)[keyof typeof ROLE];
