import { ROLE } from '../constants/roles';

export function relationDocumentId(value: any): string | null {
  if (typeof value === 'string') return value;
  if (typeof value?.documentId === 'string') return value.documentId;

  const connected = Array.isArray(value?.connect) ? value.connect[0] : value?.connect;
  if (typeof connected === 'string') return connected;
  if (typeof connected?.documentId === 'string') return connected.documentId;
  return null;
}

export async function findCourse(
  strapi: any,
  documentId: string,
) {
  return strapi.documents('api::course.course').findOne({
    documentId,
    populate: { owner: true },
  });
}

export function canManageLoadedCourse(user: any, course: any): boolean {
  const role = user?.role?.name;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true;
  if (role !== ROLE.INSTRUCTOR) return false;
  return Boolean(
    course &&
    ((course.owner?.documentId && course.owner.documentId === user.documentId) ||
      course.owner?.id === user.id),
  );
}

export async function hasEnrollment(
  strapi: any,
  userId: number,
  courseDocumentId: string,
): Promise<boolean> {
  const rows = await strapi.documents('api::enrollment.enrollment').findMany({
    filters: {
      student: { id: { $eq: userId } },
      course: { documentId: { $eq: courseDocumentId } },
    },
    limit: 1,
  });
  return rows.length > 0;
}
