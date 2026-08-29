import {
  createQuizAction,
  deleteQuizAction,
  updateQuizAction,
} from '../actions';
import {
  getCourseQuizSummaries,
  getManageQuiz,
  getQuizAttempts,
} from '../queries';
import { QuizEditor } from './quiz-editor';

type QuizManagementProps = {
  courseDocumentId: string;
  returnPath: string;
};

function submittedAt(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export async function QuizManagement({
  courseDocumentId,
  returnPath,
}: QuizManagementProps) {
  const summaries = await getCourseQuizSummaries(courseDocumentId);
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
        {quizzes.length === 0 && <p className="muted">No quizzes in this course yet.</p>}
        {quizzes.map(({ quiz, attempts }) => (
          <article className="quiz-admin-card" key={quiz.documentId}>
            <div className="section-heading">
              <div>
                <h3>{quiz.title}</h3>
                <p className="muted">{quiz.questions.length} questions · {attempts.length} attempts</p>
              </div>
              <form action={deleteQuizAction.bind(
                null,
                quiz.documentId,
                courseDocumentId,
                returnPath,
              )}>
                <button className="danger-button small-button" type="submit">Delete quiz</button>
              </form>
            </div>
            <details>
              <summary>Edit questions</summary>
              <QuizEditor
                action={updateQuizAction.bind(
                  null,
                  quiz.documentId,
                  courseDocumentId,
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

        <details className="quiz-create-panel">
          <summary>Add quiz</summary>
          <QuizEditor
            action={createQuizAction.bind(null, courseDocumentId, returnPath)}
            submitLabel="Create quiz"
          />
        </details>
      </div>
    </details>
  );
}
