import Link from 'next/link';

import { renderForRoles } from '@/features/auth/components/role-guard';
import { getMyQuizAttempts } from '@/features/quiz/queries';
import { ROLE } from '@/lib/constants';

function submittedAt(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function renderResults() {
  const attempts = await getMyQuizAttempts();

  return (
    <>
      <p className="eyebrow">Quiz history</p>
      <h1>My results</h1>
      <p className="lead">Every quiz submission is saved, including re-attempts.</p>
      {attempts.length === 0 ? (
        <p className="empty-state section-gap">You have not submitted a quiz yet.</p>
      ) : (
        <div className="progress-table-wrap panel section-gap results-table">
          <table className="progress-table">
            <thead>
              <tr><th>Quiz</th><th>Course</th><th>Score</th><th>Submitted</th></tr>
            </thead>
            <tbody>
              {attempts.map((attempt) => {
                const percent = attempt.total === 0
                  ? 0
                  : Math.round((attempt.score / attempt.total) * 100);
                return (
                  <tr key={attempt.documentId}>
                    <td><strong>{attempt.quiz?.title ?? 'Deleted quiz'}</strong></td>
                    <td>
                      {attempt.course ? (
                        <Link href={`/student/courses/${attempt.course.documentId}`}>
                          {attempt.course.title}
                        </Link>
                      ) : 'Deleted course'}
                    </td>
                    <td>{attempt.score} / {attempt.total} ({percent}%)</td>
                    <td>{submittedAt(attempt.submittedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function ResultsPage() {
  return renderForRoles([ROLE.STUDENT], renderResults);
}
