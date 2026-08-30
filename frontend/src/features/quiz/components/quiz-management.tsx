import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StrapiError } from '@/lib/strapi';
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
import type { ManagerQuizAttempt, Quiz, QuizSummary } from '../types';
import { QuizEditor } from './quiz-editor';

type QuizManagementProps = {
  moduleDocumentId: string;
  returnPath: string;
  availableQuizzes?: QuizSummary[];
  canManageModule?: boolean;
};


type ManageableQuiz = {
  quiz: Quiz;
  attempts: ManagerQuizAttempt[];
};

function isExpectedAccessError(error: unknown): boolean {
  return error instanceof StrapiError && (error.status === 403 || error.status === 404);
}

async function getManageableQuiz(summary: QuizSummary): Promise<ManageableQuiz | null> {
  try {
    const quiz = await getManageQuiz(summary.documentId);
    let attempts: ManagerQuizAttempt[] = [];
    try {
      attempts = await getQuizAttempts(summary.documentId);
    } catch (error) {
      if (!isExpectedAccessError(error)) throw error;
    }
    return { quiz, attempts };
  } catch (error) {
    if (isExpectedAccessError(error)) return null;
    throw error;
  }
}

async function filterManageableQuizSummaries(summaries: QuizSummary[]): Promise<QuizSummary[]> {
  const checked = await Promise.all(summaries.map(async (summary) => {
    try {
      await getManageQuiz(summary.documentId);
      return summary;
    } catch (error) {
      if (isExpectedAccessError(error)) return null;
      throw error;
    }
  }));
  return checked.filter((summary): summary is QuizSummary => Boolean(summary));
}

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
  canManageModule = true,
}: QuizManagementProps) {
  const summaries = await getModuleQuizSummaries(moduleDocumentId);
  const [quizResults, manageableAvailableQuizzes] = await Promise.all([
    Promise.all(summaries.map(getManageableQuiz)),
    filterManageableQuizSummaries(availableQuizzes),
  ]);
  const quizzes = quizResults.filter((item): item is ManageableQuiz => Boolean(item));

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
              {canManageModule && (
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
              )}
            </CardHeader>
            <CardContent className="admin-stack">
              {canManageModule && (
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
              )}

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

        {canManageModule && manageableAvailableQuizzes.length > 0 && (
          <details className="admin-disclosure subtle">
            <summary>Attach existing quiz</summary>
            <form
              action={attachQuizToModuleAction.bind(null, moduleDocumentId, returnPath)}
              className="admin-form-grid"
            >
              <Label>Quiz
                <Select name="quizDocumentId" required>
                  {manageableAvailableQuizzes.map((quiz) => (
                    <option key={quiz.documentId} value={quiz.documentId}>{quiz.title}</option>
                  ))}
                </Select>
              </Label>
              <Button className="self-end justify-self-start" type="submit">Attach quiz</Button>
            </form>
          </details>
        )}

        {canManageModule && (
        <details className="quiz-create-panel admin-disclosure subtle">
          <summary>Add quiz</summary>
          <QuizEditor
            action={createQuizAction.bind(null, moduleDocumentId, returnPath)}
            submitLabel="Create quiz"
          />
        </details>
        )}
      </div>
    </details>
  );
}
