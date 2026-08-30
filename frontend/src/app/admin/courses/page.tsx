import { CourseManagement } from '@/features/courses/components/course-management';

export default function AdminCoursesPage() {
  return (
    <CourseManagement
      eyebrow="Admin dashboard"
      title="All courses"
      returnPath="/admin/courses"
    />
  );
}
