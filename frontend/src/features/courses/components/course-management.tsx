import {
  createCourseAction,
  createLessonAction,
  deleteCourseAction,
  deleteLessonAction,
  updateCourseAction,
  updateLessonAction,
} from '@/features/courses/actions';
import { getCourseLessons, getManageableCourses } from '@/features/courses/queries';
import { getCourseStudentProgress } from '@/features/progress/queries';
import { QuizManagement } from '@/features/quiz/components/quiz-management';

type CourseManagementProps = {
  eyebrow: string;
  title: string;
  returnPath: string;
};

export async function CourseManagement({
  eyebrow,
  title,
  returnPath,
}: CourseManagementProps) {
  const courses = await getManageableCourses();
  const courseDetails = await Promise.all(
    courses.map(async (course) => [
      course.documentId,
      await getCourseLessons(course.documentId),
      await getCourseStudentProgress(course.documentId),
    ] as const),
  );
  const lessonsByCourse = new Map(courseDetails.map(([documentId, lessons]) => [documentId, lessons]));
  const progressByCourse = new Map(courseDetails.map(([documentId, , progress]) => [documentId, progress]));

  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lead">Create courses, edit their details, and maintain lessons in sequence.</p>

      <section className="panel stack">
        <h2>Create a course</h2>
        <form action={createCourseAction.bind(null, returnPath)} className="content-form">
          <label>Title<input name="title" required /></label>
          <label>Description<textarea name="description" rows={4} /></label>
          <label>Cover image URL<input name="coverImageUrl" type="url" /></label>
          <button type="submit">Create course</button>
        </form>
      </section>

      <section className="stack section-gap">
        <div className="section-heading">
          <h2>Courses</h2>
          <span className="count-badge">{courses.length}</span>
        </div>
        {courses.length === 0 && <p className="empty-state">No courses yet.</p>}
        {courses.map((course) => {
          const lessons = lessonsByCourse.get(course.documentId) ?? [];
          const studentProgress = progressByCourse.get(course.documentId) ?? [];
          return (
            <article className="panel stack" key={course.documentId}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{course.owner?.username ? `Owner: ${course.owner.username}` : 'Course'}</p>
                  <h2>{course.title}</h2>
                </div>
                <form action={deleteCourseAction.bind(null, course.documentId, returnPath)}>
                  <button className="danger-button" type="submit">Delete course</button>
                </form>
              </div>

              <details>
                <summary>Edit course details</summary>
                <form action={updateCourseAction.bind(null, course.documentId, returnPath)} className="content-form compact-form">
                  <label>Title<input name="title" defaultValue={course.title} required /></label>
                  <label>Description<textarea name="description" rows={3} defaultValue={course.description ?? ''} /></label>
                  <label>Cover image URL<input name="coverImageUrl" type="url" defaultValue={course.coverImageUrl ?? ''} /></label>
                  <button type="submit">Save course</button>
                </form>
              </details>

              <div className="lesson-admin">
                <h3>Lessons ({lessons.length})</h3>
                {lessons.map((lesson) => (
                  <details className="lesson-edit" key={lesson.documentId}>
                    <summary>{lesson.order}. {lesson.title}</summary>
                    <form action={updateLessonAction.bind(null, lesson.documentId, course.documentId, returnPath)} className="content-form compact-form">
                      <label>Title<input name="title" defaultValue={lesson.title} required /></label>
                      <label>Order<input name="order" type="number" min="0" defaultValue={lesson.order} required /></label>
                      <label>Text<textarea name="content" rows={5} defaultValue={lesson.content ?? ''} /></label>
                      <label>Video URL<input name="videoUrl" type="text" inputMode="url" placeholder="https://youtu.be/..." defaultValue={lesson.videoUrl ?? ''} /></label>
                      <div className="button-row">
                        <button type="submit">Save lesson</button>
                        <button className="danger-button" formAction={deleteLessonAction.bind(null, lesson.documentId, course.documentId, returnPath)} type="submit">Delete lesson</button>
                      </div>
                    </form>
                  </details>
                ))}

                <details>
                  <summary>Add lesson</summary>
                  <form action={createLessonAction.bind(null, course.documentId, returnPath)} className="content-form compact-form">
                    <label>Title<input name="title" required /></label>
                    <label>Order<input name="order" type="number" min="0" defaultValue={lessons.length} required /></label>
                    <label>Text<textarea name="content" rows={5} /></label>
                    <label>Video URL<input name="videoUrl" type="text" inputMode="url" placeholder="https://youtu.be/..." /></label>
                    <button type="submit">Add lesson</button>
                  </form>
                </details>
              </div>

              <QuizManagement
                courseDocumentId={course.documentId}
                returnPath={returnPath}
              />

              <details className="student-progress-panel">
                <summary>Student progress ({studentProgress.length})</summary>
                {studentProgress.length === 0 ? (
                  <p className="muted">No students are enrolled in this course.</p>
                ) : (
                  <div className="progress-table-wrap">
                    <table className="progress-table">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Completed</th>
                          <th>Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentProgress.map((row) => (
                          <tr key={row.student.documentId ?? row.student.id}>
                            <td><strong>{row.student.username}</strong><span>{row.student.email}</span></td>
                            <td>{row.completed} / {row.totalLessons}</td>
                            <td>
                              <div className="table-progress">
                                <progress max={100} value={row.percent}>{row.percent}%</progress>
                                <span>{row.percent}%</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </details>
            </article>
          );
        })}
      </section>
    </>
  );
}
