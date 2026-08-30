'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

import { submitQuizAction } from '../actions';
import type { StudentQuiz, SubmitQuizState } from '../types';

const INITIAL_STATE: SubmitQuizState = { result: null, error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} type="submit">
      {pending ? 'Grading…' : 'Submit for grading'}
    </button>
  );
}

export function QuizTaker({ quiz }: { quiz: StudentQuiz }) {
  const [state, action] = useActionState(
    submitQuizAction.bind(null, quiz.documentId, quiz.courseDocumentId),
    INITIAL_STATE,
  );

  if (state.result) {
    return (
      <section className="panel quiz-result" aria-live="polite">
        <p className="eyebrow">Graded immediately</p>
        <h2>{state.result.score} / {state.result.total}</h2>
        <strong>{state.result.percent}%</strong>
        <progress max={100} value={state.result.percent}>{state.result.percent}%</progress>
        <p className="muted">This attempt has been saved to your results history.</p>
        <div className="button-row">
          <Link className="button primary" href="/student/results">View all results</Link>
          <a className="button secondary" href="">Take again</a>
        </div>
      </section>
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
