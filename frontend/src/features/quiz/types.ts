export type QuizQuestion = {
  id?: number;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
};

export type Quiz = {
  id: number;
  documentId: string;
  title: string;
  questions: QuizQuestion[];
  modules?: Array<{
    documentId: string;
    title?: string;
  }>;
};

export type QuizSummary = {
  documentId: string;
  title: string;
  questionCount: number;
};

export type StudentQuizQuestion = {
  index: number;
  questionText: string;
  options: string[];
};

export type StudentQuiz = {
  documentId: string;
  courseDocumentId: string;
  title: string;
  questions: StudentQuizQuestion[];
};

export type QuizQuestionExplanation = {
  index: number;
  explanation: string;
};

export type QuizGradeResult = {
  score: number;
  total: number;
  percent: number;
  attemptDocumentId: string;
  explanations: QuizQuestionExplanation[];
};

export type SubmitQuizState = {
  result: QuizGradeResult | null;
  error: string | null;
};

export type QuizAttempt = {
  id: number;
  documentId: string;
  score: number;
  total: number;
  submittedAt: string;
  quiz?: {
    documentId: string;
    title: string;
  } | null;
  course?: {
    documentId: string;
    title: string;
  } | null;
};

export type ManagerQuizAttempt = {
  documentId: string;
  student: {
    id: number;
    documentId?: string;
    username: string;
  };
  score: number;
  total: number;
  percent: number;
  submittedAt: string;
};
