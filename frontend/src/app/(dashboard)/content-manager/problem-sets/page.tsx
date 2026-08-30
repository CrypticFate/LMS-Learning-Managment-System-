import { renderForRoles } from '@/features/auth/components/role-guard';
import { ProblemSetManagement } from '@/features/problem-sets/problem-set-management';
import { getProblemSets } from '@/features/problem-sets/queries';
import { ROLE } from '@/lib/constants';

export default function ContentManagerProblemSetsPage() {
  return renderForRoles([ROLE.CONTENT_MANAGER], async () => {
    const problems = await getProblemSets();
    return (
      <ProblemSetManagement
        eyebrow="Content manager"
        problems={problems}
        returnPath="/content-manager/problem-sets"
        title="Problem sets"
      />
    );
  });
}
