import Link from 'next/link';

import { renderForRoles } from '@/features/auth/components/role-guard';
import { getCourse, getCourseLessons } from '@/features/courses/queries';
import {
  markLessonCompleteAction,
  unmarkLessonCompleteAction,
} from '@/features/progress/actions';
import { getCourseProgress } from '@/features/progress/queries';
import { getCourseQuizSummaries } from '@/features/quiz/queries';
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

async function renderLessonViewer({ params, searchParams }: LessonViewerProps) {
  const { documentId } = await params;
  const query = await searchParams;
  const [course, lessons, progress, quizzes] = await Promise.all([
    getCourse(documentId),
    getCourseLessons(documentId),
    getCourseProgress(documentId),
    getCourseQuizSummaries(documentId),
  ]);
  const completedLessons = new Set(progress.completedLessonDocumentIds);
  const requested = Number.parseInt(query.lesson ?? '0', 10);
  const selectedIndex = Number.isInteger(requested)
    ? Math.min(Math.max(requested, 0), Math.max(lessons.length - 1, 0))
    : 0;
  const selected = lessons[selectedIndex];
  const videoUrl = embeddableUrl(selected?.videoUrl);

  return (
    <>
      <p className="eyebrow">My Courses</p>
      <h1>{course.title}</h1>
      <section className="course-progress" aria-label="Course progress">
        <div>
          <strong>{progress.completed} of {progress.totalLessons} lessons</strong>
          <span>{progress.percent}% complete</span>
        </div>
        <progress max={100} value={progress.percent}>{progress.percent}%</progress>
      </section>
      <div className="lesson-viewer section-gap">
        <aside className="lesson-list" aria-label="Lessons in course order">
          <h2>Lessons</h2>
          {lessons.map((lesson, index) => (
            <Link
              className={index === selectedIndex ? 'active' : ''}
              href={`/student/courses/${documentId}?lesson=${index}`}
              key={lesson.documentId}
            >
              <span className="lesson-number">
                {completedLessons.has(lesson.documentId) ? '✓' : lesson.order}
              </span>{lesson.title}
            </Link>
          ))}
          {quizzes.length > 0 && (
            <div className="course-quiz-links">
              <h3>Quizzes</h3>
              {quizzes.map((quiz) => (
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
        </aside>
        <article className="lesson-pane">
          {!selected ? (
            <p className="empty-state">This course has no lessons yet.</p>
          ) : (
            <>
              <p className="eyebrow">Lesson {selectedIndex + 1} of {lessons.length}</p>
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
                <button
                  className={completedLessons.has(selected.documentId) ? 'completed-button' : ''}
                  type="submit"
                >
                  {completedLessons.has(selected.documentId)
                    ? 'Completed ✓ — mark incomplete'
                    : 'Mark complete'}
                </button>
              </form>
              <div className="button-row lesson-navigation">
                {selectedIndex > 0 && (
                  <Link className="button secondary" href={`/student/courses/${documentId}?lesson=${selectedIndex - 1}`}>Previous</Link>
                )}
                {selectedIndex < lessons.length - 1 && (
                  <Link className="button primary" href={`/student/courses/${documentId}?lesson=${selectedIndex + 1}`}>Next lesson</Link>
                )}
              </div>
            </>
          )}
        </article>
      </div>
    </>
  );
}

export default function LessonViewerPage(props: LessonViewerProps) {
  return renderForRoles([ROLE.STUDENT], () => renderLessonViewer(props));
}
