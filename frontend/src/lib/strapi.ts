import 'server-only';

import { cookies } from 'next/headers';

import { AUTH_COOKIE } from '@/lib/constants';

const BASE_URL = (process.env.STRAPI_URL ?? 'http://localhost:1337').replace(/\/$/, '');

type StrapiFetchOptions = RequestInit & { auth?: boolean };

export class StrapiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
    path: string,
  ) {
    super(`Strapi ${status} on ${path}: ${body}`);
    this.name = 'StrapiError';
  }
}

export async function strapiFetch<T>(
  path: string,
  options: StrapiFetchOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');

  if (options.auth) {
    const jwt = (await cookies()).get(AUTH_COOKIE)?.value;
    if (jwt) {
      headers.set('Authorization', `Bearer ${jwt}`);
    }
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.text();
    throw new StrapiError(response.status, body, path);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
