'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Select } from '@/components/ui/select';
import { ROLE } from '@/lib/constants';

import { changeUserRoleAction } from '../actions';
import type { AdminUser, RoleChangeState } from '../types';

const INITIAL_STATE: RoleChangeState = { ok: false, message: null };

function RoleSelect({ currentRole }: { currentRole?: string }) {
  const { pending } = useFormStatus();

  return (
    <Select
      aria-label="User role"
      className="min-w-44"
      defaultValue={currentRole}
      disabled={pending}
      name="role"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {Object.values(ROLE).map((role) => (
        <option key={role} value={role}>{role}</option>
      ))}
    </Select>
  );
}

export function RoleSelector({ user }: { user: AdminUser }) {
  const [state, action, pending] = useActionState(
    changeUserRoleAction.bind(null, user.id),
    INITIAL_STATE,
  );

  return (
    <form action={action} className="role-change-form admin-role-control">
      <RoleSelect currentRole={user.role?.name} />
      <span
        className={state.message ? (state.ok ? 'form-success' : 'form-error') : 'muted'}
        role={state.ok ? 'status' : state.message ? 'alert' : undefined}
      >
        {pending ? 'Saving...' : state.message}
      </span>
    </form>
  );
}
