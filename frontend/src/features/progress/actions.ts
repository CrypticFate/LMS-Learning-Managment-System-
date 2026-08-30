'use server';

import { revalidatePath } from 'next/cache';

import { strapiFetch } from '@/lib/strapi';

function revalidateProgress(courseDocumentId: string): void {
  revalidatePath(`/student/courses/${courseDocumentId}`);
  revalidatePath('/student/my-courses');
}

export async function markLessonCompleteAction(
  courseDocumentId: string,
  lessonDocumentId: string,
): Promise<void> {
  await strapiFetch('/api/progress/complete', {
    auth: true,
    method: 'POST',
    body: JSON.stringify({ data: { course: courseDocumentId, lesson: lessonDocumentId } }),
  });
  revalidateProgress(courseDocumentId);
}

export async function unmarkLessonCompleteAction(
  courseDocumentId: string,
  lessonDocumentId: string,
): Promise<void> {
  await strapiFetch(`/api/progress/complete/${encodeURIComponent(lessonDocumentId)}?course=${encodeURIComponent(courseDocumentId)}`, {
    auth: true,
    method: 'DELETE',
  });
  revalidateProgress(courseDocumentId);
}
