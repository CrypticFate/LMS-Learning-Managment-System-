export type CourseOwner = {
  id: number;
  documentId?: string;
  username: string;
};

export type Comment = {
  id: number;
  documentId: string;
  body: string;
  author?: {
    id: number;
    documentId?: string;
    username: string;
  } | null;
  createdAt: string;
};

export type Lesson = {
  id: number;
  documentId: string;
  title: string;
  content?: string | null;
  videoUrl?: string | null;
  order: number;
  comments?: Comment[];
  modules?: Array<{
    documentId: string;
    title: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type Module = {
  id: number;
  documentId: string;
  title: string;
  description?: string | null;
  order: number;
  lessons?: Lesson[];
  quizzes?: { documentId: string; title: string }[];
  createdAt?: string;
  courses?: Array<{
    documentId: string;
    title: string;
  }>;
  updatedAt?: string;
};

export type Course = {
  id: number;
  documentId: string;
  title: string;
  slug?: string | null;
  description?: string | null;
  coverImageUrl?: string | null;
  owner?: CourseOwner | null;
  modules?: Module[];
  createdAt: string;
  updatedAt: string;
};

export type Enrollment = {
  id: number;
  documentId: string;
  enrolledAt: string;
  course: Course | null;
};
