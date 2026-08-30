import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  attachQuizToModuleAction,
  detachQuizFromModuleAction,
} from '@/features/courses/actions';

import {
  createQuizAction,
  deleteQuizAction,
  updateQuizAction,
} from '../actions';
import {
  getManageQuiz,
  getModuleQuizSummaries,
  getQuizAttempts,
} from '../queries';
import type { QuizSummary } from '../types';
import { QuizEditor } from './quiz-editor';

type QuizManagementProps = {
  moduleDocumentId: string;
  returnPath: string;
  availableQuizzes?: QuizSummary[];
};

function submittedAt(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export async function QuizManagement({
  moduleDocumentId,
  returnPath,
  availableQuizzes = [],
}: QuizManagementProps) {
  const summaries = await getModuleQuizSummaries(moduleDocumentId);
  const quizzes = await Promise.all(summaries.map(async (summary) => {
    const [quiz, attempts] = await Promise.all([
      getManageQuiz(summary.documentId),
      getQuizAttempts(summary.documentId),
    ]);
    return { quiz, attempts };
  }));

  return (
    <details className="quiz-management admin-disclosure">
      <summary>Quizzes ({quizzes.length})</summary>
      <div className="admin-stack quiz-management-content">
        {quizzes.length === 0 && <p className="muted">No quizzes in this module yet.</p>}

        {quizzes.map(({ quiz, attempts }) => (
          <Card className="quiz-admin-card" key={quiz.documentId}>
            <CardHeader className="admin-card-header">
              <div>
                <Badge variant="secondary">{quiz.questions.length} questions</Badge>
                <CardTitle className="mt-3">{quiz.title}</CardTitle>
                <CardDescription>{attempts.length} submitted attempts</CardDescription>
              </div>
              <div className="admin-row-actions">
                <form action={detachQuizFromModuleAction.bind(
                  null,
                  moduleDocumentId,
                  quiz.documentId,
                  returnPath,
                )}>
                  <Button variant="outline" size="sm" type="submit">Remove quiz</Button>
                </form>
                <form action={deleteQuizAction.bind(null, quiz.documentId, returnPath)}>
                  <Button className="danger-button" variant="outline" size="sm" type="submit">Delete everywhere</Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="admin-stack">
              <details className="admin-disclosure subtle">
                <summary>Edit questions</summary>
                <QuizEditor
                  action={updateQuizAction.bind(
                    null,
                    quiz.documentId,
                    returnPath,
                  )}
                  initialQuestions={quiz.questions}
                  initialTitle={quiz.title}
                  submitLabel="Save quiz"
                />
              </details>

              <details className="admin-disclosure subtle">
                <summary>Results ({attempts.length})</summary>
                {attempts.length === 0 ? (
                  <p className="muted">No attempts submitted yet.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <Table>
                      <TableHeader>
                        <TableRow><TableHead>Student</TableHead><TableHead>Score</TableHead><TableHead>Submitted</TableHead></TableRow>
                      </TableHeader>
                      <TableBody>
                        {attempts.map((attempt) => (
                          <TableRow key={attempt.documentId}>
                            <TableCell><strong>{attempt.student?.username ?? 'Unknown student'}</strong></TableCell>
                            <TableCell>
                              <Badge variant={attempt.percent >= 70 ? 'default' : 'outline'}>
                                {attempt.score} / {attempt.total} ({attempt.percent}%)
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[var(--muted)]">{submittedAt(attempt.submittedAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </details>
            </CardContent>
          </Card>
        ))}

        {availableQuizzes.length > 0 && (
          <details className="admin-disclosure subtle">
            <summary>Attach existing quiz</summary>
            <form
              action={attachQuizToModuleAction.bind(null, moduleDocumentId, returnPath)}
              className="admin-form-grid"
            >
              <Label>Quiz
                <Select name="quizDocumentId" required>
                  {availableQuizzes.map((quiz) => (
                    <option key={quiz.documentId} value={quiz.documentId}>{quiz.title}</option>
                  ))}
                </Select>
              </Label>
              <Button className="self-end justify-self-start" type="submit">Attach quiz</Button>
            </form>
          </details>
        )}

        <details className="quiz-create-panel admin-disclosure subtle">
          <summary>Add quiz</summary>
          <QuizEditor
            action={createQuizAction.bind(null, moduleDocumentId, returnPath)}
            submitLabel="Create quiz"
          />
        </details>
      </div>
    </details>
  );
}
