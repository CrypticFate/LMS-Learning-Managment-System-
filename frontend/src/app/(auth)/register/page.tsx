import type { Metadata } from 'next';

import { AuthForm } from '@/features/auth/components/auth-form';

export const metadata: Metadata = { title: 'Register' };

export default function RegisterPage() {
  return (
    <main className="auth-shell">
      <AuthForm mode="register" />
    </main>
  );
}
