import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type { AdminStats, AdminUser } from './types';

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await strapiFetch<{ data: AdminUser[] }>('/api/admin/users', {
    auth: true,
  });
  return response.data;
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await strapiFetch<{ data: AdminStats }>('/api/admin/stats', {
    auth: true,
  });
  return response.data;
}
