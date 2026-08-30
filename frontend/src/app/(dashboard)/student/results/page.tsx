import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <Badge variant="secondary">Quiz history</Badge>
          <h1>My results</h1>
          <p>Every quiz submission is saved, including re-attempts.</p>
        </div>
        <div className="admin-hero-count">
          <strong>{attempts.length}</strong>
          <span>Attempts</span>
        </div>
      </section>

      <Card className="admin-card section-gap">
        <CardHeader>
          <CardTitle>Quiz attempts</CardTitle>
          <CardDescription>Track scores and jump back to the related course.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {attempts.length === 0 ? (
            <p className="empty-state admin-empty-state">You have not submitted a quiz yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quiz</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt) => {
                    const percent = attempt.total === 0
                      ? 0
                      : Math.round((attempt.score / attempt.total) * 100);
                    return (
                      <TableRow key={attempt.documentId}>
                        <TableCell><strong>{attempt.quiz?.title ?? 'Deleted quiz'}</strong></TableCell>
                        <TableCell>
                          {attempt.course ? (
                            <Link href={`/student/courses/${attempt.course.documentId}`}>
                              {attempt.course.title}
                            </Link>
                          ) : 'Deleted course'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={percent >= 70 ? 'default' : 'outline'}>
                            {attempt.score} / {attempt.total} ({percent}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[var(--muted)]">{submittedAt(attempt.submittedAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResultsPage() {
  return renderForRoles([ROLE.STUDENT], renderResults);
}
