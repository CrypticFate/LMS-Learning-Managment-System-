export type ProblemDifficulty = 'easy' | 'medium' | 'hard';

export type ProblemSet = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  category: string;
  difficulty: ProblemDifficulty;
  problemUrl: string;
  description?: string | null;
  order: number;
  attemptedAt?: string | null;
  completedAt?: string | null;
  progressDocumentId?: string | null;
};

export type ProblemProgressRecord = {
  documentId: string;
  attemptedAt: string;
  completedAt?: string | null;
  student?: {
    id: number;
    documentId?: string;
    username: string;
    email: string;
  } | null;
  problemSet?: {
    documentId: string;
    title: string;
    category: string;
    difficulty: ProblemDifficulty;
  } | null;
};

export type ProblemProgressSummary = {
  student: {
    id: number;
    documentId?: string;
    username: string;
    email: string;
  };
  attempted: number;
  completed: number;
  totalProblems: number;
  percent: number;
  records?: ProblemProgressRecord[];
};

export type ProblemSetFormState = {
  ok: boolean;
  message: string | null;
};
