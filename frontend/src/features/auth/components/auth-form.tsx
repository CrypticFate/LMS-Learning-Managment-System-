'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect } from 'react';

import {
  loginAction,
  registerAction,
} from '@/features/auth/actions';
import type { AuthActionState } from '@/features/auth/types';

const initialState: AuthActionState = { ok: false, error: '' };

type AuthFormProps = {
  mode: 'login' | 'register';
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const action = mode === 'login' ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) {
      router.replace(state.data.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  const isLogin = mode === 'login';

  return (
    <div className="auth-card">
      <div>
        <p className="eyebrow">LMS workspace</p>
        <h1>{isLogin ? 'Welcome back' : 'Create a student account'}</h1>
        <p className="muted">
          {isLogin
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
          {pending ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <p className="muted">
        {isLogin ? 'Need an account? ' : 'Already registered? '}
        <Link href={isLogin ? '/register' : '/login'}>
          {isLogin ? 'Register' : 'Sign in'}
        </Link>
      </p>
    </div>
  );
}
