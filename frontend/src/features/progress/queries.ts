import 'server-only';

import { strapiFetch } from '@/lib/strapi';
import type { CourseProgress, StudentCourseProgress } from './types';

export async function getCourseProgress(courseDocumentId: string): Promise<CourseProgress> {
  const response = await strapiFetch<{ data: CourseProgress }>(
    `/api/progress/course/${encodeURIComponent(courseDocumentId)}`,
    { auth: true },
  );
  return response.data;
}

export async function getMyProgress(): Promise<CourseProgress[]> {
  const response = await strapiFetch<{ data: CourseProgress[] }>('/api/progress/me', {
    auth: true,
  });
  return response.data;
}

export async function getCourseStudentProgress(
  courseDocumentId: string,
): Promise<StudentCourseProgress[]> {
  const response = await strapiFetch<{ data: StudentCourseProgress[] }>(
    `/api/courses/${encodeURIComponent(courseDocumentId)}/progress`,
    { auth: true },
  );
  return response.data;
}
