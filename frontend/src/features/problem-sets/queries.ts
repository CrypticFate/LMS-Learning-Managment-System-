import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type { ProblemProgressRecord, ProblemProgressSummary, ProblemSet } from './types';

export async function getProblemSets(): Promise<ProblemSet[]> {
  const response = await strapiFetch<{ data: ProblemSet[] }>('/api/problem-sets', {
    auth: true,
  });
  return response.data;
}

export async function getMyProblemProgress(): Promise<ProblemProgressSummary> {
  const response = await strapiFetch<{ data: ProblemProgressSummary }>('/api/problem-progress/me', {
    auth: true,
  });
  return response.data;
}

export async function getProblemStudentProgress(): Promise<ProblemProgressSummary[]> {
  const response = await strapiFetch<{ data: ProblemProgressSummary[] }>('/api/problem-progress/students', {
    auth: true,
  });
  return response.data;
}

export async function getProblemProgressRecords(): Promise<ProblemProgressRecord[]> {
  const response = await strapiFetch<{ data: ProblemProgressRecord[] }>('/api/problem-sets/admin/progress', {
    auth: true,
  });
  return response.data;
}
