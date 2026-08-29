import Link from 'next/link';
import { notFound } from 'next/navigation';

import { renderForRoles } from '@/features/auth/components/role-guard';
import { QuizTaker } from '@/features/quiz/components/quiz-taker';
import { getTakeQuiz } from '@/features/quiz/queries';
import { ROLE } from '@/lib/constants';

type QuizPageProps = {
  params: Promise<{ documentId: string; quizId: string }>;
};

async function renderQuiz({ params }: QuizPageProps) {
  const { documentId, quizId } = await params;
  const quiz = await getTakeQuiz(quizId);
  if (quiz.courseDocumentId !== documentId) notFound();

  return (
    <>
      <p className="eyebrow">Course quiz</p>
      <h1>{quiz.title}</h1>
      <p className="lead">
        Choose one answer for each question. Your score is calculated securely on
        the server and saved as a new attempt.
      </p>
      <div className="button-row">
        <Link className="button secondary" href={`/student/courses/${documentId}`}>
          Back to course
        </Link>
      </div>
      <section className="panel section-gap">
        <QuizTaker quiz={quiz} />
      </section>
    </>
  );
}

export default function QuizPage(props: QuizPageProps) {
  return renderForRoles([ROLE.STUDENT], () => renderQuiz(props));
}
