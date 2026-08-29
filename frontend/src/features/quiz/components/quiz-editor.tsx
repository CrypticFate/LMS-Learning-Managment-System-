'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

import type { QuizQuestion } from '../types';

type EditorQuestion = QuizQuestion & { key: number };

type QuizEditorProps = {
  action: (formData: FormData) => Promise<void>;
  initialTitle?: string;
  initialQuestions?: QuizQuestion[];
  submitLabel: string;
};

let nextKey = 1;

function blankQuestion(): EditorQuestion {
  return {
    key: nextKey++,
    questionText: '',
    options: ['', ''],
    correctIndex: 0,
  };
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} type="submit">{pending ? 'Saving…' : label}</button>;
}

export function QuizEditor({
  action,
  initialTitle = '',
  initialQuestions = [],
  submitLabel,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState<EditorQuestion[]>(() => (
    initialQuestions.length > 0
      ? initialQuestions.map((question) => ({ ...question, key: nextKey++ }))
      : [blankQuestion()]
  ));

  function updateQuestion(
    questionIndex: number,
    update: (question: EditorQuestion) => EditorQuestion,
  ) {
    setQuestions((current) => current.map((question, index) => (
      index === questionIndex ? update(question) : question
    )));
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    updateQuestion(questionIndex, (question) => {
      const options = question.options.filter((_, index) => index !== optionIndex);
      let correctIndex = question.correctIndex;
      if (correctIndex === optionIndex) correctIndex = 0;
      if (correctIndex > optionIndex) correctIndex -= 1;
      return { ...question, options, correctIndex };
    });
  }

  const serialized = questions.map(({ questionText, options, correctIndex }) => ({
    questionText,
    options,
    correctIndex,
  }));

  return (
    <form action={action} className="quiz-editor">
      <label className="quiz-title-field">
        Quiz title
        <input defaultValue={initialTitle} name="title" required />
      </label>
      <input name="questions" type="hidden" value={JSON.stringify(serialized)} />

      <div className="quiz-question-list">
        {questions.map((question, questionIndex) => (
          <fieldset className="quiz-question-editor" key={question.key}>
            <legend>Question {questionIndex + 1}</legend>
            <label>
              Question text
              <textarea
                onChange={(event) => updateQuestion(questionIndex, (current) => ({
                  ...current,
                  questionText: event.target.value,
                }))}
                required
                rows={2}
                value={question.questionText}
              />
            </label>
            <div className="quiz-options-editor">
              <span>Options (select the correct answer)</span>
              {question.options.map((option, optionIndex) => (
                <div className="quiz-option-editor" key={optionIndex}>
                  <input
                    aria-label={`Mark option ${optionIndex + 1} correct`}
                    checked={question.correctIndex === optionIndex}
                    name={`correct-${question.key}`}
                    onChange={() => updateQuestion(questionIndex, (current) => ({
                      ...current,
                      correctIndex: optionIndex,
                    }))}
                    type="radio"
                  />
                  <input
                    aria-label={`Option ${optionIndex + 1}`}
                    onChange={(event) => updateQuestion(questionIndex, (current) => ({
                      ...current,
                      options: current.options.map((value, index) => (
                        index === optionIndex ? event.target.value : value
                      )),
                    }))}
                    placeholder={`Option ${optionIndex + 1}`}
                    required
                    value={option}
                  />
                  <button
                    className="small-button danger-button"
                    disabled={question.options.length <= 2}
                    onClick={() => removeOption(questionIndex, optionIndex)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                className="small-button secondary-button"
                disabled={question.options.length >= 6}
                onClick={() => updateQuestion(questionIndex, (current) => ({
                  ...current,
                  options: [...current.options, ''],
                }))}
                type="button"
              >
                Add option
              </button>
            </div>
            <button
              className="small-button danger-button"
              disabled={questions.length === 1}
              onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}
              type="button"
            >
              Remove question
            </button>
          </fieldset>
        ))}
      </div>

      <div className="button-row">
        <button className="secondary-button" onClick={() => setQuestions((current) => [...current, blankQuestion()])} type="button">
          Add question
        </button>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
