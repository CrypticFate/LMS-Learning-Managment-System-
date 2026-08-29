export type CourseOwner = {
  id: number;
  documentId?: string;
  username: string;
};

export type Lesson = {
  id: number;
  documentId: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export type Course = {
  id: number;
  documentId: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  owner?: CourseOwner | null;
  lessons?: Lesson[];
  createdAt: string;
  updatedAt: string;
};

export type Enrollment = {
  id: number;
  documentId: string;
  enrolledAt: string;
  course: Course | null;
};
