import 'server-only';

import { cookies } from 'next/headers';

import { strapiFetch } from '@/lib/strapi';
import { AUTH_COOKIE } from '@/lib/constants';
import type { CurrentUser } from '@/features/auth/types';

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jwt = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!jwt) return null;

  try {
    return await strapiFetch<CurrentUser>('/api/users/me?populate=role', { auth: true });
  } catch {
    return null;
  }
}
