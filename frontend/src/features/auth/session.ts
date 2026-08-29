import 'server-only';

import { cookies } from 'next/headers';
import { cache } from 'react';

import { strapiFetch } from '@/lib/strapi';
import { AUTH_COOKIE } from '@/lib/constants';
import type { CurrentUser } from '@/features/auth/types';

async function loadCurrentUser(): Promise<CurrentUser | null> {
  const jwt = (await cookies()).get(AUTH_COOKIE)?.value;
  if (!jwt) return null;

  try {
    return await strapiFetch<CurrentUser>('/api/users/me?populate=role', {
      headers: { Authorization: `Bearer ${jwt}` },
    });
  } catch {
    return null;
  }
}

// A layout and its page often need the same user. React's request-scoped cache
// keeps both renders on one authoritative session lookup.
export const getCurrentUser = cache(loadCurrentUser);
