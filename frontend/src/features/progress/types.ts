export type CourseProgress = {
  courseDocumentId: string;
  completed: number;
  totalLessons: number;
  percent: number;
  completedLessonDocumentIds: string[];
};

export type ProgressStudent = {
  id: number;
  documentId?: string;
  username: string;
  email: string;
};

export type StudentCourseProgress = {
  student: ProgressStudent;
  completed: number;
  totalLessons: number;
  percent: number;
};
