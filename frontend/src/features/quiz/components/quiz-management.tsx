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
    <details className="quiz-management">
      <summary>Quizzes ({quizzes.length})</summary>
      <div className="stack quiz-management-content">
        {quizzes.length === 0 && <p className="muted">No quizzes in this module yet.</p>}
        {quizzes.map(({ quiz, attempts }) => (
          <article className="quiz-admin-card" key={quiz.documentId}>
            <div className="section-heading">
              <div>
                <h3>{quiz.title}</h3>
                <p className="muted">{quiz.questions.length} questions - {attempts.length} attempts</p>
              </div>
              <div className="button-row">
                {(quiz.modules?.length ?? 0) > 1 && (
                  <form action={detachQuizFromModuleAction.bind(
                    null,
                    moduleDocumentId,
                    quiz.documentId,
                    returnPath,
                  )}>
                    <button className="secondary small-button" type="submit">Remove from module</button>
                  </form>
                )}
                <form action={deleteQuizAction.bind(null, quiz.documentId, returnPath)}>
                  <button className="danger-button small-button" type="submit">Delete everywhere</button>
                </form>
              </div>
            </div>
            <details>
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
            <details>
              <summary>Results ({attempts.length})</summary>
              {attempts.length === 0 ? (
                <p className="muted">No attempts submitted yet.</p>
              ) : (
                <div className="progress-table-wrap">
                  <table className="progress-table">
                    <thead>
                      <tr><th>Student</th><th>Score</th><th>Submitted</th></tr>
                    </thead>
                    <tbody>
                      {attempts.map((attempt) => (
                        <tr key={attempt.documentId}>
                          <td><strong>{attempt.student?.username ?? 'Unknown student'}</strong></td>
                          <td>{attempt.score} / {attempt.total} ({attempt.percent}%)</td>
                          <td>{submittedAt(attempt.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>
          </article>
        ))}

        {availableQuizzes.length > 0 && (
          <details>
            <summary>Attach existing quiz</summary>
            <form
              action={attachQuizToModuleAction.bind(null, moduleDocumentId, returnPath)}
              className="content-form compact-form"
            >
              <label>Quiz
                <select name="quizDocumentId" required>
                  {availableQuizzes.map((quiz) => (
                    <option key={quiz.documentId} value={quiz.documentId}>{quiz.title}</option>
                  ))}
                </select>
              </label>
              <button type="submit">Attach quiz</button>
            </form>
          </details>
        )}

        <details className="quiz-create-panel">
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
