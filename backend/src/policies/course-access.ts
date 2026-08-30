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

/**
 * Check if an instructor can manage at least one of the courses linked to a module.
 */
export function canManageAnyCourse(user: any, courses: any[]): boolean {
  const role = user?.role?.name;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true;
  if (role !== ROLE.INSTRUCTOR) return false;
  return courses.some((course: any) => canManageLoadedCourse(user, course));
}

/**
 * Shared modules, lessons, and quizzes affect every parent course. Instructors
 * may therefore edit shared content only when they own every linked course.
 */
export function canManageAllCourses(user: any, courses: any[]): boolean {
  const role = user?.role?.name;
  if (role === ROLE.ADMIN || role === ROLE.CONTENT_MANAGER) return true;
  if (role !== ROLE.INSTRUCTOR || courses.length === 0) return false;
  return courses.every((course: any) => canManageLoadedCourse(user, course));
}

export function relatedCourses(value: any): any[] {
  const seen = new Set<string | number>();
  const courses: any[] = [];
  for (const module of value?.modules ?? []) {
    for (const course of module?.courses ?? []) {
      const key = course?.documentId ?? course?.id;
      if (key === undefined || seen.has(key)) continue;
      seen.add(key);
      courses.push(course);
    }
  }
  return courses;
}

export function isRelatedToCourse(value: any, courseDocumentId: string): boolean {
  return relatedCourses(value).some((course) => course.documentId === courseDocumentId);
}

export async function findModuleWithCourses(strapi: any, documentId: string) {
  return strapi.documents('api::module.module').findOne({
    documentId,
    populate: { courses: { populate: { owner: true } } },
  });
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

/**
 * Check enrollment against any of a module's parent courses.
 */
export async function hasEnrollmentInAnyModuleCourse(
  strapi: any,
  userId: number,
  module: any,
): Promise<boolean> {
  const courses = module?.courses;
  if (!Array.isArray(courses) || courses.length === 0) return false;
  for (const course of courses) {
    if (await hasEnrollment(strapi, userId, course.documentId)) return true;
  }
  return false;
}
