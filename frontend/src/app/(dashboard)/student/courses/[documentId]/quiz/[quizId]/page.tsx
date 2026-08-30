import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { renderForRoles } from '@/features/auth/components/role-guard';
import { QuizTaker } from '@/features/quiz/components/quiz-taker';
import { getTakeQuiz } from '@/features/quiz/queries';
import { ROLE } from '@/lib/constants';

type QuizPageProps = {
  params: Promise<{ documentId: string; quizId: string }>;
};

async function renderQuiz({ params }: QuizPageProps) {
  const { documentId, quizId } = await params;
  const quiz = await getTakeQuiz(quizId, documentId);
  if (quiz.courseDocumentId !== documentId) notFound();

  return (
    <div className="learning-page">
      <section className="learning-hero">
        <div>
          <Badge variant="secondary">Course quiz</Badge>
          <h1>{quiz.title}</h1>
          <p>
            Choose one answer for each question. Your score is calculated securely on
            the server and saved as a new attempt.
          </p>
        </div>
        <Link className={buttonVariants({ variant: 'outline' })} href={`/student/courses/${documentId}`}>
          Back to course
        </Link>
      </section>
      <Card className="admin-card section-gap">
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>{quiz.questions.length} questions in this quiz.</CardDescription>
        </CardHeader>
        <CardContent>
          <QuizTaker quiz={quiz} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function QuizPage(props: QuizPageProps) {
  return renderForRoles([ROLE.STUDENT], () => renderQuiz(props));
}
