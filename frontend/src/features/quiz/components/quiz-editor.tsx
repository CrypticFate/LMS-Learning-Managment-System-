'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { QuizQuestion } from '../types';

type EditorQuestion = QuizQuestion;

type QuizEditorProps = {
  action: (formData: FormData) => Promise<void>;
  initialTitle?: string;
  initialQuestions?: QuizQuestion[];
  submitLabel: string;
};

function blankQuestion(): EditorQuestion {
  return {
    questionText: '',
    options: ['', ''],
    correctIndex: 0,
    explanation: '',
  };
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? 'Saving...' : label}</Button>;
}

export function QuizEditor({
  action,
  initialTitle = '',
  initialQuestions = [],
  submitLabel,
}: QuizEditorProps) {
  const [questions, setQuestions] = useState<EditorQuestion[]>(() => (
    initialQuestions.length > 0
      ? initialQuestions.map((question) => ({ ...question }))
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

  const serialized = questions.map(({ questionText, options, correctIndex, explanation }) => ({
    questionText,
    options,
    correctIndex,
    explanation: explanation ?? '',
  }));

  return (
    <form action={action} className="quiz-editor">
      <Label className="quiz-title-field">
        Quiz title
        <Input defaultValue={initialTitle} name="title" required />
      </Label>
      <input name="questions" type="hidden" value={JSON.stringify(serialized)} />

      <div className="quiz-question-list">
        {questions.map((question, questionIndex) => (
          <fieldset className="quiz-question-editor" key={questionIndex}>
            <legend>Question {questionIndex + 1}</legend>
            <Label>
              Question text
              <Textarea
                onChange={(event) => updateQuestion(questionIndex, (current) => ({
                  ...current,
                  questionText: event.target.value,
                }))}
                required
                rows={2}
                value={question.questionText}
              />
            </Label>
            <div className="quiz-options-editor">
              <span>Options (select the correct answer)</span>
              {question.options.map((option, optionIndex) => (
                <div className="quiz-option-editor" key={optionIndex}>
                  <input
                    aria-label={`Mark option ${optionIndex + 1} correct`}
                    checked={question.correctIndex === optionIndex}
                    name={`correct-${questionIndex}`}
                    onChange={() => updateQuestion(questionIndex, (current) => ({
                      ...current,
                      correctIndex: optionIndex,
                    }))}
                    type="radio"
                  />
                  <Input
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
                  <Button
                    className="danger-button"
                    size="sm"
                    variant="outline"
                    disabled={question.options.length <= 2}
                    onClick={() => removeOption(questionIndex, optionIndex)}
                    type="button"
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={question.options.length >= 6}
                onClick={() => updateQuestion(questionIndex, (current) => ({
                  ...current,
                  options: [...current.options, ''],
                }))}
                type="button"
              >
                Add option
              </Button>
            </div>
            <Label>
              Explanation shown after attempt
              <Textarea
                onChange={(event) => updateQuestion(questionIndex, (current) => ({
                  ...current,
                  explanation: event.target.value,
                }))}
                placeholder="Explain why the correct answer is right and what to review."
                rows={3}
                value={question.explanation ?? ''}
              />
            </Label>
            <Button
              className="danger-button justify-self-start"
              size="sm"
              variant="outline"
              disabled={questions.length === 1}
              onClick={() => setQuestions((current) => current.filter((_, index) => index !== questionIndex))}
              type="button"
            >
              Remove question
            </Button>
          </fieldset>
        ))}
      </div>

      <div className="button-row">
        <Button variant="outline" onClick={() => setQuestions((current) => [...current, blankQuestion()])} type="button">
          Add question
        </Button>
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}
