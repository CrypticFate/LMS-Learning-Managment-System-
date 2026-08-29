'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import type {
  AuthActionState,
  CurrentUser,
} from '@/features/auth/types';
import {
  AUTH_COOKIE,
  DASHBOARD_ROUTE_BY_ROLE,
  ROLE,
} from '@/lib/constants';
import { strapiFetch } from '@/lib/strapi';

type StrapiAuthResponse = {
  jwt: string;
};

const initialError = 'Unable to authenticate with those details.';

function textField(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function jwtExpiresAt(jwt: string): Date | undefined {
  try {
    const payload = jwt.split('.')[1];
    if (!payload) return undefined;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = JSON.parse(Buffer.from(normalized, 'base64').toString('utf8')) as {
      exp?: unknown;
    };
    return typeof decoded.exp === 'number' ? new Date(decoded.exp * 1000) : undefined;
  } catch {
    return undefined;
  }
}

async function getUserForJwt(jwt: string): Promise<CurrentUser> {
  return strapiFetch<CurrentUser>('/api/users/me?populate=role', {
    headers: { Authorization: `Bearer ${jwt}` },
  });
}

async function setSessionCookie(jwt: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: jwtExpiresAt(jwt),
  });
}

async function establishSession(jwt: string): Promise<AuthActionState> {
  try {
    const user = await getUserForJwt(jwt);
    await setSessionCookie(jwt);
    const redirectTo = DASHBOARD_ROUTE_BY_ROLE[user.role.name] ?? '/';
    return { ok: true, data: { redirectTo } };
  } catch {
    return { ok: false, error: initialError };
  }
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = textField(formData, 'identifier');
  const password = textField(formData, 'password');

  if (!identifier || !password) {
    return { ok: false, error: 'Email or username and password are required.' };
  }

  try {
    const response = await strapiFetch<StrapiAuthResponse>('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    return establishSession(response.jwt);
  } catch {
    return { ok: false, error: initialError };
  }
}

export async function adminLoginAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = textField(formData, 'identifier');
  const password = textField(formData, 'password');

  if (!identifier || !password) {
    return { ok: false, error: 'Email or username and password are required.' };
  }

  try {
    const response = await strapiFetch<StrapiAuthResponse>('/api/auth/local', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    const user = await getUserForJwt(response.jwt);

    if (user.role.name !== ROLE.ADMIN) {
      return { ok: false, error: 'Admin access only.' };
    }

    await setSessionCookie(response.jwt);
    return { ok: true, data: { redirectTo: '/admin' } };
  } catch {
    return { ok: false, error: initialError };
  }
}

export async function registerAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = textField(formData, 'username');
  const email = textField(formData, 'email');
  const password = textField(formData, 'password');

  if (!username || !email || !password) {
    return { ok: false, error: 'Username, email, and password are required.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must contain at least 8 characters.' };
  }

  try {
    const response = await strapiFetch<StrapiAuthResponse>('/api/auth/local/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    return establishSession(response.jwt);
  } catch {
    return {
      ok: false,
      error: 'Registration failed. The email or username may already be in use.',
    };
  }
}

export async function logoutAction(): Promise<never> {
  (await cookies()).delete(AUTH_COOKIE);
  redirect('/login');
}
