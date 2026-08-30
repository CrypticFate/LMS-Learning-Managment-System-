import { renderForRoles } from '@/features/auth/components/role-guard';
import { ProblemSetManagement } from '@/features/problem-sets/problem-set-management';
import { getProblemSets } from '@/features/problem-sets/queries';
import { ROLE } from '@/lib/constants';

export default function InstructorProblemSetsPage() {
  return renderForRoles([ROLE.INSTRUCTOR], async () => {
    const problems = await getProblemSets();
    return (
      <ProblemSetManagement
        eyebrow="Instructor workspace"
        problems={problems}
        returnPath="/instructor/problem-sets"
        title="Problem sets"
      />
    );
  });
}
