export type BlogPost = {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  isPublished: boolean;
  publishedAt?: string | null;
  updatedAt: string;
  author?: {
    id: number;
    documentId?: string;
    username: string;
  } | null;
};
