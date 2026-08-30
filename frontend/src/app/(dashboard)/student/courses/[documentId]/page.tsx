import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { renderForRoles } from '@/features/auth/components/role-guard';
import {
  createCommentAction,
  deleteCommentAction,
} from '@/features/courses/actions';
import { getCurrentUser } from '@/features/auth/session';
import { getCourse, getCourseModules, getLessonComments, getModuleLessons } from '@/features/courses/queries';
import type { Comment, Lesson, Module } from '@/features/courses/types';
import {
  markLessonCompleteAction,
  unmarkLessonCompleteAction,
} from '@/features/progress/actions';
import { getCourseProgress } from '@/features/progress/queries';
import { getModuleQuizSummaries } from '@/features/quiz/queries';
import { ROLE } from '@/lib/constants';

type LessonViewerProps = {
  params: Promise<{ documentId: string }>;
  searchParams: Promise<{ lesson?: string }>;
};

function embeddableUrl(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    let youtubeId: string | null = null;

    if (hostname === 'youtu.be') {
      youtubeId = url.pathname.split('/').filter(Boolean)[0] ?? null;
    } else if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com' ||
      hostname === 'youtube-nocookie.com'
    ) {
      if (url.pathname === '/watch') {
        youtubeId = url.searchParams.get('v');
      } else {
        const [kind, id] = url.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(kind)) youtubeId = id ?? null;
      }
    }

    if (youtubeId && /^[a-zA-Z0-9_-]+$/.test(youtubeId)) {
      return `https://www.youtube-nocookie.com/embed/${youtubeId}`;
    }

    return url.toString();
  } catch {
    return null;
  }
}

type ModuleWithLessonsAndQuizzes = Module & {
  detailedLessons: Lesson[];
  quizSummaries: { documentId: string; title: string; questionCount: number }[];
};

function formatCommentDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

async function renderLessonViewer({ params, searchParams }: LessonViewerProps) {
  const { documentId } = await params;
  const query = await searchParams;
  const [course, modules, progress, currentUser] = await Promise.all([
    getCourse(documentId),
    getCourseModules(documentId),
    getCourseProgress(documentId),
    getCurrentUser(),
  ]);

  // Fetch lessons for each module + quiz summaries
  const modulesWithDetails: ModuleWithLessonsAndQuizzes[] = await Promise.all(
    modules.map(async (mod) => {
      const [detailedLessons, quizSummaries] = await Promise.all([
        getModuleLessons(mod.documentId),
        getModuleQuizSummaries(mod.documentId),
      ]);
      return { ...mod, detailedLessons, quizSummaries };
    }),
  );

  // Flatten all lessons in module order for sequential navigation
  const allLessons: { lesson: Lesson; moduleTitle: string }[] = [];
  for (const mod of modulesWithDetails) {
    for (const lesson of mod.detailedLessons) {
      allLessons.push({ lesson, moduleTitle: mod.title });
    }
  }

  const completedLessons = new Set(progress.completedLessonDocumentIds);
  const requested = Number.parseInt(query.lesson ?? '0', 10);
  const selectedIndex = Number.isInteger(requested)
    ? Math.min(Math.max(requested, 0), Math.max(allLessons.length - 1, 0))
    : 0;
  const selectedEntry = allLessons[selectedIndex];
  const selected = selectedEntry?.lesson;
  const videoUrl = embeddableUrl(selected?.videoUrl);

  // Fetch comments for the selected lesson
  let comments: Comment[] = [];
  if (selected) {
    comments = await getLessonComments(selected.documentId);
  }

  return (
    <>
      <div className="learning-page">
        <section className="learning-hero">
        <div>
          <Badge variant="secondary">My Courses</Badge>
          <h1>{course.title}</h1>
          <p>Work through lessons, quizzes, and course discussions.</p>
        </div>
        </section>
      <section className="course-progress" aria-label="Course progress">
        <div>
          <strong>{progress.completed} of {progress.totalLessons} lessons</strong>
          <span>{progress.percent}% complete</span>
        </div>
        <progress max={100} value={progress.percent}>{progress.percent}%</progress>
      </section>
      <div className="lesson-viewer section-gap">
        <aside className="lesson-list" aria-label="Lessons grouped by module">
          <h2>Modules</h2>
          {modulesWithDetails.map((mod) => {
            const moduleStartIndex = allLessons.findIndex(
              (entry) => mod.detailedLessons[0]?.documentId === entry.lesson.documentId,
            );
            return (
              <div className="module-group" key={mod.documentId}>
                <h3 className="module-group-title">{mod.title}</h3>
                {mod.detailedLessons.map((lesson, lessonIdx) => {
                  const flatIndex = moduleStartIndex + lessonIdx;
                  return (
                    <Link
                      className={flatIndex === selectedIndex ? 'active' : ''}
                      href={`/student/courses/${documentId}?lesson=${flatIndex}`}
                      key={lesson.documentId}
                    >
                      <span className="lesson-number">
                        {completedLessons.has(lesson.documentId) ? '✓' : lesson.order}
                      </span>{lesson.title}
                    </Link>
                  );
                })}
                {mod.quizSummaries.length > 0 && (
                  <div className="course-quiz-links">
                    <h4>Quizzes</h4>
                    {mod.quizSummaries.map((quiz) => (
                      <Link
                        href={`/student/courses/${documentId}/quiz/${quiz.documentId}`}
                        key={quiz.documentId}
                      >
                        <span className="lesson-number">?</span>
                        <span>{quiz.title}<small>{quiz.questionCount} questions</small></span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </aside>
        <Card className="lesson-pane">
          <CardContent className="p-0">
            {!selected ? (
            <p className="empty-state">This course has no lessons yet.</p>
          ) : (
            <>
              <Badge variant="outline">{selectedEntry.moduleTitle} · Lesson {selectedIndex + 1} of {allLessons.length}</Badge>
              <h2>{selected.title}</h2>
              {videoUrl && (
                <div className="video-frame">
                  <iframe
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    src={videoUrl}
                    title={selected.title}
                  />
                </div>
              )}
              {selected.content && <div className="lesson-content">{selected.content}</div>}
              <form
                action={(completedLessons.has(selected.documentId)
                  ? unmarkLessonCompleteAction
                  : markLessonCompleteAction
                ).bind(null, documentId, selected.documentId)}
                className="completion-toggle"
              >
                <Button
                  className={completedLessons.has(selected.documentId) ? 'completed-button' : ''}
                  type="submit"
                >
                  {completedLessons.has(selected.documentId)
                    ? 'Completed ✓ — mark incomplete'
                    : 'Mark complete'}
                </Button>
              </form>
              <div className="button-row lesson-navigation">
                {selectedIndex > 0 && (
                  <Link className={buttonVariants({ variant: 'outline' })} href={`/student/courses/${documentId}?lesson=${selectedIndex - 1}`}>Previous</Link>
                )}
                {selectedIndex < allLessons.length - 1 && (
                  <Link className={buttonVariants()} href={`/student/courses/${documentId}?lesson=${selectedIndex + 1}`}>Next lesson</Link>
                )}
              </div>

              {/* ── Comments ── */}
              <section className="comments-section">
                <h3>Comments ({comments.length})</h3>
                <form action={createCommentAction.bind(null, selected.documentId, documentId)} className="comment-form">
                  <Textarea name="body" rows={3} placeholder="Write a comment..." required />
                  <Button type="submit">Post comment</Button>
                </form>
                {comments.length === 0 ? (
                  <p className="muted">No comments yet. Be the first!</p>
                ) : (
                  <div className="comment-list">
                    {comments.map((comment) => (
                      <div className="comment-card" key={comment.documentId}>
                        <div className="comment-header">
                          <strong>{comment.author?.username ?? 'Unknown'}</strong>
                          <span>{formatCommentDate(comment.createdAt)}</span>
                        </div>
                        <p className="comment-body">{comment.body}</p>
                        {comment.author?.id === currentUser?.id && (
                          <form action={deleteCommentAction.bind(null, comment.documentId, documentId)}>
                            <Button className="danger-button" size="sm" type="submit" variant="outline">Delete</Button>
                          </form>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}

export default function LessonViewerPage(props: LessonViewerProps) {
  return renderForRoles([ROLE.STUDENT], () => renderLessonViewer(props));
}
