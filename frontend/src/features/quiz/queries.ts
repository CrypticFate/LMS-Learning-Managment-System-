import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type {
  ManagerQuizAttempt,
  Quiz,
  QuizAttempt,
  QuizSummary,
  StudentQuiz,
} from './types';

export async function getCourseQuizSummaries(
  courseDocumentId: string,
): Promise<QuizSummary[]> {
  const response = await strapiFetch<{ data: QuizSummary[] }>(
    `/api/courses/${encodeURIComponent(courseDocumentId)}/quizzes`,
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

export async function getTakeQuiz(documentId: string): Promise<StudentQuiz> {
  const response = await strapiFetch<{ data: StudentQuiz }>(
    `/api/quizzes/${encodeURIComponent(documentId)}/take`,
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
