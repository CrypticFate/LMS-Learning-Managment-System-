import type { RoleName } from '@/lib/constants';

export type AdminUser = {
  id: number;
  documentId?: string;
  username: string;
  email: string;
  role: {
    id: number;
    name: RoleName;
    type: string;
  } | null;
};

export type AdminStats = {
  totalUsers: number;
  usersByRole: Record<string, number>;
  totalCourses: number;
  totalEnrollments: number;
  totalBlogPosts: number;
};

export type RoleChangeState = {
  ok: boolean;
  message: string | null;
};
