'use server';

import { revalidatePath } from 'next/cache';

import { ROLE, type RoleName } from '@/lib/constants';
import { StrapiError, strapiFetch } from '@/lib/strapi';
import type { RoleChangeState } from './types';

const ALLOWED_ROLES = Object.values(ROLE);

function messageFromError(error: unknown): string {
  if (error instanceof StrapiError) {
    try {
      const parsed = JSON.parse(error.body);
      return parsed?.error?.message ?? 'Role change failed.';
    } catch {
      return 'Role change failed.';
    }
  }
  return error instanceof Error ? error.message : 'Role change failed.';
}

export async function changeUserRoleAction(
  userId: number,
  _previousState: RoleChangeState,
  formData: FormData,
): Promise<RoleChangeState> {
  const requested = formData.get('role');
  if (
    typeof requested !== 'string' ||
    !ALLOWED_ROLES.includes(requested as RoleName)
  ) {
    return { ok: false, message: 'Choose a valid application role.' };
  }

  try {
    await strapiFetch(`/api/admin/users/${userId}/role`, {
      auth: true,
      method: 'PUT',
      body: JSON.stringify({ data: { role: requested } }),
    });
    revalidatePath('/admin');
    revalidatePath('/admin/users');
    return { ok: true, message: `Role changed to ${requested}.` };
  } catch (error) {
    return { ok: false, message: messageFromError(error) };
  }
}
