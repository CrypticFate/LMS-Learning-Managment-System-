import { ProblemSetManagement } from '@/features/problem-sets/problem-set-management';
import {
  getProblemProgressRecords,
  getProblemSets,
  getProblemStudentProgress,
} from '@/features/problem-sets/queries';

export default async function AdminProblemSetsPage() {
  const [problems, studentProgress, progressRecords] = await Promise.all([
    getProblemSets(),
    getProblemStudentProgress(),
    getProblemProgressRecords(),
  ]);
  return (
    <ProblemSetManagement
      eyebrow="Admin dashboard"
      progressRecords={progressRecords}
      problems={problems}
      returnPath="/admin/problem-sets"
      showProgress
      studentProgress={studentProgress}
      title="Problem sets"
    />
  );
}
