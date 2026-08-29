import { renderForRoles } from '@/features/auth/components/role-guard';
import { CourseManagement } from '@/features/courses/components/course-management';
import { ROLE } from '@/lib/constants';

export default function InstructorDashboardPage() {
  return renderForRoles([ROLE.INSTRUCTOR], () => (
    <CourseManagement eyebrow="Instructor dashboard" title="My courses" returnPath="/instructor" />
  ));
}
