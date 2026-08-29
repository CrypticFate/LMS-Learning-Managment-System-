'use client';

import Link from 'next/link';
import { useActionState, useEffect } from 'react';

import {
  adminLoginAction,
  loginAction,
  registerAction,
} from '@/features/auth/actions';
import type { AuthActionState } from '@/features/auth/types';

const initialState: AuthActionState = { ok: false, error: '' };

type AuthFormProps = {
  mode: 'admin-login' | 'login' | 'register';
};

export function AuthForm({ mode }: AuthFormProps) {
  const action = mode === 'admin-login'
    ? adminLoginAction
    : mode === 'login'
      ? loginAction
      : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) {
      // Start a fresh document request after the Server Action sets the cookie.
      // This prevents a public layout cached before login from showing guest UI.
      window.location.replace(state.data.redirectTo);
    }
  }, [state]);

  const isLogin = mode !== 'register';
  const isAdminLogin = mode === 'admin-login';

  return (
    <div className="auth-card">
      <div>
        <p className="eyebrow">{isAdminLogin ? 'Admin portal' : 'LMS workspace'}</p>
        <h1>
          {isAdminLogin ? 'Admin sign in' : isLogin ? 'Welcome back' : 'Create a student account'}
        </h1>
        <p className="muted">
          {isAdminLogin
            ? 'Use an Admin account to continue.'
            : isLogin
            ? 'Sign in to continue to your role-specific dashboard.'
            : 'New public accounts start with the Student role.'}
        </p>
      </div>

      <form action={formAction} className="auth-form">
        {!isLogin && (
          <label>
            Username
            <input name="username" autoComplete="username" required />
          </label>
        )}

        <label>
          {isLogin ? 'Email or username' : 'Email'}
          <input
            name={isLogin ? 'identifier' : 'email'}
            type={isLogin ? 'text' : 'email'}
            autoComplete={isLogin ? 'username' : 'email'}
            required
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 8}
            required
          />
        </label>

        {!state.ok && state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending}>
          {pending
            ? 'Please wait…'
            : isAdminLogin
              ? 'Sign in as admin'
              : isLogin
                ? 'Sign in'
                : 'Create account'}
        </button>
      </form>

      <p className="muted">
        {isAdminLogin ? (
          <Link href="/">Return to LMS home</Link>
        ) : (
          <>
            {isLogin ? 'Need an account? ' : 'Already registered? '}
            <Link href={isLogin ? '/register' : '/login'}>
              {isLogin ? 'Register' : 'Sign in'}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
