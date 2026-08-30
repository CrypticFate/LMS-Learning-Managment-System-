'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { submitQuizAction } from '../actions';
import type { StudentQuiz, SubmitQuizState } from '../types';

const INITIAL_STATE: SubmitQuizState = { result: null, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button disabled={pending} type="submit">
      {pending ? 'Grading...' : 'Submit for grading'}
    </Button>
  );
}

export function QuizTaker({ quiz }: { quiz: StudentQuiz }) {
  const [state, action] = useActionState(
    submitQuizAction.bind(null, quiz.documentId, quiz.courseDocumentId),
    INITIAL_STATE,
  );
  const explanations = state.result?.explanations ?? [];
  const explanationByIndex = new Map(explanations.map((item) => [item.index, item.explanation]));

  if (state.result) {
    return (
      <Card className="quiz-result" aria-live="polite">
        <CardHeader>
          <Badge variant="secondary">Graded immediately</Badge>
          <CardTitle>{state.result.score} / {state.result.total}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <strong>{state.result.percent}%</strong>
          <progress max={100} value={state.result.percent}>{state.result.percent}%</progress>
          <p className="muted">This attempt has been saved to your results history.</p>
          <details className="quiz-explanations">
            <summary>Show explanations</summary>
            <div className="quiz-explanation-list">
              {quiz.questions.map((question, questionIndex) => {
                const explanation = explanationByIndex.get(question.index)?.trim();
                return (
                  <section className="quiz-explanation-item" key={question.index}>
                    <h3>Question {questionIndex + 1}</h3>
                    <p>{question.questionText}</p>
                    <div>{explanation || 'No explanation has been added for this question yet.'}</div>
                  </section>
                );
              })}
            </div>
          </details>
          <div className="button-row">
            <Link className={buttonVariants()} href="/student/results">View all results</Link>
            <a className={buttonVariants({ variant: 'outline' })} href="">Take again</a>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form action={action} className="quiz-taker">
      <input name="questionCount" type="hidden" value={quiz.questions.length} />
      {quiz.questions.map((question, questionIndex) => (
        <fieldset className="quiz-take-question" key={question.index}>
          <legend><span>{questionIndex + 1}</span>{question.questionText}</legend>
          <div className="quiz-take-options">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex}>
                <input
                  name={`answer-${questionIndex}`}
                  required
                  type="radio"
                  value={optionIndex}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div className="button-row">
        <SubmitButton />
      </div>
    </form>
  );
}
