export type BlogPostStatus = 'draft' | 'published';

export type PublicBlogPost = {
  documentId: string;
  title: string;
  slug: string;
  body: string;
  coverImageUrl?: string | null;
  publishedAt?: string | null;
  author?: {
    username: string;
  } | null;
};

export type BlogPost = PublicBlogPost & {
  id: number;
  status: BlogPostStatus;
  updatedAt: string;
  author?: {
    id: number;
    documentId?: string;
    username: string;
  } | null;
};
