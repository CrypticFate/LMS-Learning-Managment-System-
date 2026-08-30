'use server';

import { revalidatePath } from 'next/cache';

import { StrapiError, strapiFetch } from '@/lib/strapi';
import type { ProblemDifficulty, ProblemSetFormState } from './types';

const DIFFICULTIES = new Set<ProblemDifficulty>(['easy', 'medium', 'hard']);

function text(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value.trim() : '';
}

function problemData(formData: FormData) {
  const title = text(formData, 'title');
  const category = text(formData, 'category');
  const difficulty = text(formData, 'difficulty') as ProblemDifficulty;
  const rawOrder = Number.parseInt(text(formData, 'order') || '0', 10);
  const rawUrl = text(formData, 'problemUrl');
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  if (!title) throw new Error('Title is required.');
  if (!category) throw new Error('Category is required.');
  if (!DIFFICULTIES.has(difficulty)) throw new Error('Choose a valid difficulty.');
  if (!Number.isInteger(rawOrder) || rawOrder < 0) throw new Error('Order must be a non-negative integer.');

  let problemUrl: string;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    problemUrl = url.toString();
  } catch {
    throw new Error('Problem URL must be a valid http(s) URL.');
  }

  return {
    title,
    category,
    difficulty,
    problemUrl,
    order: rawOrder,
    description: text(formData, 'description'),
  };
}

function revalidateProblemSets(returnPath?: string): void {
  if (returnPath) revalidatePath(returnPath);
  revalidatePath('/student/problem-sets');
  revalidatePath('/admin/problem-sets');
  revalidatePath('/content-manager/problem-sets');
  revalidatePath('/instructor/problem-sets');
}

function errorMessage(error: unknown): string {
  if (error instanceof StrapiError) {
    try {
      const parsed = JSON.parse(error.body);
      return parsed?.error?.message ?? 'Problem set action failed.';
    } catch {
      return 'Problem set action failed.';
    }
  }
  return error instanceof Error ? error.message : 'Problem set action failed.';
}

export async function createProblemSetAction(
  returnPath: string,
  _previousState: ProblemSetFormState,
  formData: FormData,
): Promise<ProblemSetFormState> {
  try {
    await strapiFetch('/api/problem-sets', {
      auth: true,
      method: 'POST',
      body: JSON.stringify({ data: problemData(formData) }),
    });
    revalidateProblemSets(returnPath);
    return { ok: true, message: 'Problem created.' };
  } catch (error) {
    return { ok: false, message: errorMessage(error) };
  }
}

export async function updateProblemSetAction(
  documentId: string,
  returnPath: string,
  formData: FormData,
): Promise<void> {
  await strapiFetch(`/api/problem-sets/${encodeURIComponent(documentId)}`, {
    auth: true,
    method: 'PUT',
    body: JSON.stringify({ data: problemData(formData) }),
  });
  revalidateProblemSets(returnPath);
}

export async function deleteProblemSetAction(documentId: string, returnPath: string): Promise<void> {
  await strapiFetch(`/api/problem-sets/${encodeURIComponent(documentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidateProblemSets(returnPath);
}

export async function markProblemAttemptedAction(documentId: string): Promise<void> {
  await strapiFetch('/api/problem-progress/attempt', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({ data: { problemSet: documentId } }),
  });
  revalidateProblemSets('/student/problem-sets');
}

export async function markProblemCompleteAction(documentId: string): Promise<void> {
  await strapiFetch('/api/problem-progress/complete', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({ data: { problemSet: documentId } }),
  });
  revalidateProblemSets('/student/problem-sets');
}
