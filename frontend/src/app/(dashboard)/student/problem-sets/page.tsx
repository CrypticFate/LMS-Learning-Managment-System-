import { renderForRoles } from '@/features/auth/components/role-guard';
import { StudentProblemSetPage } from '@/features/problem-sets/student-problem-set-page';
import { ROLE } from '@/lib/constants';

export default function ProblemSetsPage() {
  return renderForRoles([ROLE.STUDENT], () => <StudentProblemSetPage />);
}
