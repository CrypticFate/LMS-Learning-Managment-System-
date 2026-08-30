import type { Metadata } from 'next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AuthForm } from '@/features/auth/components/auth-form';

export const metadata: Metadata = { title: 'Sign in' };

const demoAccounts = [
  ['Admin', 'admin@lms.test'],
  ['Content Manager', 'manager@lms.test'],
  ['Instructor', 'instructor@lms.test'],
  ['Student', 'student@lms.test'],
] as const;

export default function LoginPage() {
  return (
    <main className="auth-shell auth-shell-with-demo">
      <AuthForm mode="login" />
      <Card className="demo-login-card">
        <CardHeader>
          <Badge variant="secondary">Demo access</Badge>
          <CardTitle>Review accounts</CardTitle>
          <CardDescription>Use any seeded account below. All demo accounts share the same password.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="demo-login-password">
            <span>Password</span>
            <strong>Passw0rd!</strong>
          </div>
          <div className="admin-table-wrap demo-login-table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Email</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoAccounts.map(([role, email]) => (
                  <TableRow key={email}>
                    <TableCell><strong>{role}</strong></TableCell>
                    <TableCell className="font-mono text-xs text-[var(--muted)]">{email}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
