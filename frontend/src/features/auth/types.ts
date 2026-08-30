import type { RoleName } from '@/lib/constants';

export type CurrentUser = {
  id: number;
  documentId: string;
  username: string;
  email: string;
  codeforcesHandle?: string | null;
  vjudgeHandle?: string | null;
  discordHandle?: string | null;
  codechefHandle?: string | null;
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

export type ProfileSuccess = {
  user: CurrentUser;
};

export type ProfileActionState = ActionResult<ProfileSuccess>;
