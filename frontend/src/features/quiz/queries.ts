import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type {
  ManagerQuizAttempt,
  Quiz,
  QuizAttempt,
  QuizSummary,
  StudentQuiz,
} from './types';

export async function getModuleQuizSummaries(
  moduleDocumentId: string,
): Promise<QuizSummary[]> {
  const response = await strapiFetch<{ data: QuizSummary[] }>(
    `/api/modules/${encodeURIComponent(moduleDocumentId)}/quizzes`,
    { auth: true },
  );
  return response.data;
}

export async function getManageQuiz(documentId: string): Promise<Quiz> {
  const response = await strapiFetch<{ data: Quiz }>(
    `/api/quizzes/${encodeURIComponent(documentId)}`,
    { auth: true },
  );
  return response.data;
}

export async function getTakeQuiz(
  documentId: string,
  courseDocumentId: string,
): Promise<StudentQuiz> {
  const response = await strapiFetch<{ data: StudentQuiz }>(
    `/api/quizzes/${encodeURIComponent(documentId)}/take?course=${encodeURIComponent(courseDocumentId)}`,
    { auth: true },
  );
  return response.data;
}

export async function getMyQuizAttempts(): Promise<QuizAttempt[]> {
  const response = await strapiFetch<{ data: QuizAttempt[] }>('/api/quiz-attempts/me', {
    auth: true,
  });
  return response.data;
}

export async function getQuizAttempts(
  documentId: string,
): Promise<ManagerQuizAttempt[]> {
  const response = await strapiFetch<{ data: ManagerQuizAttempt[] }>(
    `/api/quizzes/${encodeURIComponent(documentId)}/attempts`,
    { auth: true },
  );
  return response.data;
}
