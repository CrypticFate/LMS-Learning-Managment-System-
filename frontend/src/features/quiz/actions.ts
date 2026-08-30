'use server';

import { revalidatePath } from 'next/cache';

import { StrapiError, strapiFetch } from '@/lib/strapi';
import type {
  QuizGradeResult,
  QuizQuestion,
  SubmitQuizState,
} from './types';

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function quizData(formData: FormData): { title: string; questions: QuizQuestion[] } {
  const title = text(formData, 'title');
  if (!title) throw new Error('Quiz title is required.');

  let questions: unknown;
  try {
    questions = JSON.parse(text(formData, 'questions'));
  } catch {
    throw new Error('Quiz questions are invalid.');
  }
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('Add at least one quiz question.');
  }

  const normalized = questions.map((question, questionIndex) => {
    const value = question as Partial<QuizQuestion>;
    const questionText = typeof value.questionText === 'string'
      ? value.questionText.trim()
      : '';
    const options = Array.isArray(value.options)
      ? value.options.map((option) => typeof option === 'string' ? option.trim() : '')
      : [];
    const correctIndex = Number(value.correctIndex);

    if (!questionText) throw new Error(`Question ${questionIndex + 1} needs text.`);
    if (options.length < 2 || options.length > 6 || options.some((option) => !option)) {
      throw new Error(`Question ${questionIndex + 1} needs 2–6 non-empty options.`);
    }
    if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
      throw new Error(`Choose the correct answer for question ${questionIndex + 1}.`);
    }
    const explanation = typeof value.explanation === 'string'
      ? value.explanation.trim()
      : '';
    return { questionText, options, correctIndex, explanation };
  });

  return { title, questions: normalized };
}

function revalidateQuizPages(returnPath: string): void {
  revalidatePath(returnPath);
  revalidatePath('/student/results');
}

export async function createQuizAction(
  moduleDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch('/api/quizzes', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({
      data: { ...quizData(formData), module: moduleDocumentId },
    }),
  });
  revalidateQuizPages(returnPath);
}

export async function updateQuizAction(
  quizDocumentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch(`/api/quizzes/${encodeURIComponent(quizDocumentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: quizData(formData) }),
  });
  revalidateQuizPages(returnPath);
}

export async function deleteQuizAction(
  quizDocumentId: string,
  returnPath: string,
): Promise<void> {
  await strapiFetch(`/api/quizzes/${encodeURIComponent(quizDocumentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidateQuizPages(returnPath);
}

function errorMessage(error: unknown): string {
  if (error instanceof StrapiError) {
    try {
      const parsed = JSON.parse(error.body);
      return parsed?.error?.message ?? 'The quiz could not be submitted.';
    } catch {
      return 'The quiz could not be submitted.';
    }
  }
  return error instanceof Error ? error.message : 'The quiz could not be submitted.';
}

export async function submitQuizAction(
  quizDocumentId: string,
  courseDocumentId: string,
  _previousState: SubmitQuizState,
  formData: FormData,
): Promise<SubmitQuizState> {
  const questionCount = Number.parseInt(text(formData, 'questionCount'), 10);
  if (!Number.isInteger(questionCount) || questionCount < 1) {
    return { result: null, error: 'This quiz has no questions.' };
  }

  const answers = Array.from({ length: questionCount }, (_, index) => {
    const raw = text(formData, `answer-${index}`);
    return raw === '' ? Number.NaN : Number.parseInt(raw, 10);
  });
  if (answers.some((answer) => !Number.isInteger(answer))) {
    return { result: null, error: 'Answer every question before submitting.' };
  }

  try {
    const response = await strapiFetch<{ data: QuizGradeResult }>(
      `/api/quizzes/${encodeURIComponent(quizDocumentId)}/submit`,
      {
        auth: true,
        method: 'POST',
        body: JSON.stringify({ data: { answers, course: courseDocumentId } }),
      },
    );
    revalidatePath('/student/results');
    return { result: response.data, error: null };
  } catch (error) {
    return { result: null, error: errorMessage(error) };
  }
}
