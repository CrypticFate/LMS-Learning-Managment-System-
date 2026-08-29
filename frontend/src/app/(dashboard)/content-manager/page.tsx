import { renderForRoles } from '@/features/auth/components/role-guard';
import { CourseManagement } from '@/features/courses/components/course-management';
import { ROLE } from '@/lib/constants';

export default function ContentManagerDashboardPage() {
  return renderForRoles([ROLE.CONTENT_MANAGER], () => (
    <CourseManagement
      eyebrow="Content manager dashboard"
      title="Content library"
      returnPath="/content-manager"
    />
  ));
}
