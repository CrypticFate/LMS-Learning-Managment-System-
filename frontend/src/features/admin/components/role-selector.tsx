'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { changeUserRoleAction } from '../actions';
import type { AdminUser, RoleChangeState } from '../types';
import { ROLE } from '@/lib/constants';

const INITIAL_STATE: RoleChangeState = { ok: false, message: null };

function RoleSelect({ currentRole }: { currentRole?: string }) {
  const { pending } = useFormStatus();

  return (
    <select
      aria-label="User role"
      defaultValue={currentRole}
      disabled={pending}
      name="role"
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {Object.values(ROLE).map((role) => (
        <option key={role} value={role}>{role}</option>
      ))}
    </select>
  );
}

export function RoleSelector({ user }: { user: AdminUser }) {
  const [state, action, pending] = useActionState(
    changeUserRoleAction.bind(null, user.id),
    INITIAL_STATE,
  );

  return (
    <form action={action} className="role-change-form">
      <RoleSelect currentRole={user.role?.name} />
      <span
        className={state.message ? (state.ok ? 'form-success' : 'form-error') : 'muted'}
        role={state.ok ? 'status' : state.message ? 'alert' : undefined}
      >
        {pending ? 'Saving…' : state.message}
      </span>
    </form>
  );
}
