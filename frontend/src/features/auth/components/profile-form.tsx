'use client';

import { useActionState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { updateProfileAction } from '@/features/auth/actions';
import type { CurrentUser, ProfileActionState } from '@/features/auth/types';

const initialState: ProfileActionState = { ok: false, error: '' };

export function ProfileForm({ user, returnPath }: { user: CurrentUser; returnPath: string }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const displayUser = state.ok ? state.data.user : user;

  return (
    <Card className="profile-card animate-soft-in">
      <CardHeader className="profile-card-header">
        <div className="profile-avatar" aria-hidden="true">{displayUser.username.slice(0, 1).toUpperCase()}</div>
        <div>
          <Badge variant="secondary">{displayUser.role.name}</Badge>
          <CardTitle className="mt-3">Profile information</CardTitle>
          <CardDescription>Update the account details shown across your dashboard.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="profile-form">
          <input name="returnPath" type="hidden" value={returnPath} />
          <Label>
            Username
            <Input name="username" autoComplete="username" defaultValue={displayUser.username} required />
          </Label>
          <Label>
            Email
            <Input name="email" autoComplete="email" defaultValue={displayUser.email} required type="email" />
          </Label>

          <Separator />

          <div className="profile-readonly-grid">
            <div>
              <span>Role</span>
              <strong>{displayUser.role.name}</strong>
            </div>
            <div>
              <span>Account ID</span>
              <strong>{displayUser.documentId}</strong>
            </div>
          </div>

          {!state.ok && state.error && <p className="form-error" role="alert">{state.error}</p>}
          {state.ok && <p className="form-success" role="status">Profile updated.</p>}

          <div className="button-row profile-actions">
            <Button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save changes'}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function displayValue(value: string | null | undefined) {
  return value && value.trim() ? value : 'Not set';
}

function profileCompletion(user: CurrentUser) {
  const fields = [
    user.username,
    user.email,
    user.codeforcesHandle,
    user.vjudgeHandle,
    user.discordHandle,
    user.codechefHandle,
  ];
  const complete = fields.filter((value) => Boolean(value && value.trim())).length;
  return Math.round((complete / fields.length) * 100);
}

export function StudentProfileForm({
  user,
  returnPath,
  totalAttempts,
}: {
  user: CurrentUser;
  returnPath: string;
  totalAttempts: number;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const displayUser = state.ok ? state.data.user : user;
  const completion = profileCompletion(displayUser);

  return (
    <div className="student-profile-grid animate-soft-in">
      <Card className="student-profile-card">
        <CardContent className="student-profile-card-content">
          <div className="student-profile-avatar" aria-hidden="true">{displayUser.username.slice(0, 1).toUpperCase()}</div>
          <div className="student-profile-identity">
            <h2>{displayUser.username}</h2>
            <p>{displayUser.email}</p>
          </div>

          <div className="student-profile-completion">
            <div><span>Profile completion</span><strong>{completion}%</strong></div>
            <progress value={completion} max={100}>{completion}%</progress>
          </div>

          <div className="student-profile-details" aria-label="Profile details">
            <div><span>Username</span><strong>{displayUser.email}</strong></div>
            <div><span>Codeforces</span><strong>{displayValue(displayUser.codeforcesHandle)}</strong></div>
            <div><span>VJudge</span><strong>{displayValue(displayUser.vjudgeHandle)}</strong></div>
            <div><span>Discord</span><strong>{displayValue(displayUser.discordHandle)}</strong></div>
            <div><span>CodeChef</span><strong>{displayValue(displayUser.codechefHandle)}</strong></div>
          </div>

          <details className="student-profile-edit">
            <summary>Edit profile</summary>
            <form action={formAction} className="student-profile-form">
              <input name="returnPath" type="hidden" value={returnPath} />
              <Label>
                Username
                <Input name="username" autoComplete="username" defaultValue={displayUser.username} required />
              </Label>
              <Label>
                Email
                <Input name="email" autoComplete="email" defaultValue={displayUser.email} required type="email" />
              </Label>
              <Label>
                Codeforces
                <Input name="codeforcesHandle" defaultValue={displayUser.codeforcesHandle ?? ''} placeholder="Not set" />
              </Label>
              <Label>
                VJudge
                <Input name="vjudgeHandle" defaultValue={displayUser.vjudgeHandle ?? ''} placeholder="Not set" />
              </Label>
              <Label>
                Discord
                <Input name="discordHandle" defaultValue={displayUser.discordHandle ?? ''} placeholder="Not set" />
              </Label>
              <Label>
                CodeChef
                <Input name="codechefHandle" defaultValue={displayUser.codechefHandle ?? ''} placeholder="Not set" />
              </Label>

              {!state.ok && state.error && <p className="form-error" role="alert">{state.error}</p>}
              {state.ok && <p className="form-success" role="status">Profile updated.</p>}

              <Button className="w-full" type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save changes'}</Button>
            </form>
          </details>
        </CardContent>
      </Card>

      <div className="student-profile-main">
        <div className="student-profile-stat-grid">
          <Card><CardHeader><CardDescription>Total contests</CardDescription><CardTitle>0</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>Total solved</CardDescription><CardTitle>{totalAttempts}</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>Problem rank</CardDescription><CardTitle>~0</CardTitle></CardHeader></Card>
          <Card><CardHeader><CardDescription>Overall rank</CardDescription><CardTitle>0</CardTitle></CardHeader></Card>
        </div>

        <Card className="student-contest-card">
          <CardHeader>
            <CardTitle>Contest history</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="admin-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Platform</TableHead>
                    <TableHead>Contest</TableHead>
                    <TableHead>Solved</TableHead>
                    <TableHead>Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="student-contest-empty" colSpan={4}>No contest data found.</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
