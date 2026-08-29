import type { RoleName } from '@/lib/constants';

export type CurrentUser = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  role: {
    id: number;
    name: RoleName;
    type: string;
  };
};

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type AuthSuccess = {
  redirectTo: string;
};

export type AuthActionState = ActionResult<AuthSuccess>;
