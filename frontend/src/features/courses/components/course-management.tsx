import {
  attachLessonToModuleAction,
  attachModuleToCourseAction,
  createCourseAction,
  createLessonAction,
  createModuleAction,
  deleteCourseAction,
  deleteLessonAction,
  deleteModuleAction,
  detachLessonFromModuleAction,
  detachModuleFromCourseAction,
  updateCourseAction,
  updateLessonAction,
  updateModuleAction,
} from '@/features/courses/actions';
import { getCourseModules, getManageableCourses, getModuleLessons } from '@/features/courses/queries';
import { getCourseStudentProgress } from '@/features/progress/queries';
import { QuizManagement } from '@/features/quiz/components/quiz-management';

type CourseManagementProps = {
  eyebrow: string;
  title: string;
  returnPath: string;
};

function uniqueByDocumentId<T extends { documentId: string }>(values: T[]): T[] {
  return Array.from(new Map(values.map((value) => [value.documentId, value])).values());
}

export async function CourseManagement({
  eyebrow,
  title,
  returnPath,
}: CourseManagementProps) {
  const courses = await getManageableCourses();
  const courseDetails = await Promise.all(
    courses.map(async (course) => {
      const [modules, studentProgress] = await Promise.all([
        getCourseModules(course.documentId),
        getCourseStudentProgress(course.documentId),
      ]);
      const modulesWithLessons = await Promise.all(
        modules.map(async (mod) => ({
          ...mod,
          lessons: await getModuleLessons(mod.documentId),
        })),
      );
      return { course, modules: modulesWithLessons, studentProgress };
    }),
  );

  const allModules = uniqueByDocumentId(courseDetails.flatMap(({ modules }) => modules));
  const allLessons = uniqueByDocumentId(
    allModules.flatMap((module) => module.lessons ?? []),
  );
  const allQuizzes = uniqueByDocumentId(
    allModules.flatMap((module) => (module.quizzes ?? []).map((quiz) => ({
      ...quiz,
      questionCount: 0,
    }))),
  );

  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="lead">Create courses, manage modules, edit lessons, and maintain quizzes.</p>

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
        {courseDetails.map(({ course, modules, studentProgress }) => (
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

            <div className="module-admin">
              <h3>Modules ({modules.length})</h3>
              {modules.map((mod) => (
                <details className="module-card" key={mod.documentId}>
                  <summary>
                    <span className="module-order">{mod.order}.</span> {mod.title}
                    <span className="module-meta">{mod.lessons?.length ?? 0} lessons</span>
                  </summary>
                  <div className="module-card-content stack">
                    {(mod.courses?.length ?? 0) > 1 && (
                      <form action={detachModuleFromCourseAction.bind(
                        null,
                        course.documentId,
                        mod.documentId,
                        returnPath,
                      )}>
                        <button className="secondary small-button" type="submit">Remove module from this course</button>
                      </form>
                    )}

                    <details>
                      <summary>Edit module</summary>
                      <form action={updateModuleAction.bind(null, mod.documentId, returnPath)} className="content-form compact-form">
                        <label>Title<input name="title" defaultValue={mod.title} required /></label>
                        <label>Order<input name="order" type="number" min="0" defaultValue={mod.order} required /></label>
                        <label>Description<textarea name="description" rows={2} defaultValue={mod.description ?? ''} /></label>
                        <div className="button-row">
                          <button type="submit">Save module</button>
                          <button className="danger-button" formAction={deleteModuleAction.bind(null, mod.documentId, returnPath)} type="submit">Delete everywhere</button>
                        </div>
                      </form>
                    </details>

                    <div className="lesson-admin">
                      <h4>Lessons ({(mod.lessons ?? []).length})</h4>
                      {(mod.lessons ?? []).map((lesson) => (
                        <details className="lesson-edit" key={lesson.documentId}>
                          <summary>{lesson.order}. {lesson.title}</summary>
                          <form action={updateLessonAction.bind(null, lesson.documentId, returnPath)} className="content-form compact-form">
                            <label>Title<input name="title" defaultValue={lesson.title} required /></label>
                            <label>Order<input name="order" type="number" min="0" defaultValue={lesson.order} required /></label>
                            <label>Text<textarea name="content" rows={5} defaultValue={lesson.content ?? ''} /></label>
                            <label>Video URL<input name="videoUrl" type="text" inputMode="url" placeholder="https://youtu.be/..." defaultValue={lesson.videoUrl ?? ''} /></label>
                            <div className="button-row">
                              <button type="submit">Save lesson</button>
                              {(lesson.modules?.length ?? 0) > 1 && (
                                <button
                                  className="secondary"
                                  formAction={detachLessonFromModuleAction.bind(
                                    null,
                                    mod.documentId,
                                    lesson.documentId,
                                    returnPath,
                                  )}
                                  type="submit"
                                >
                                  Remove from module
                                </button>
                              )}
                              <button className="danger-button" formAction={deleteLessonAction.bind(null, lesson.documentId, returnPath)} type="submit">Delete everywhere</button>
                            </div>
                          </form>
                        </details>
                      ))}

                      {allLessons.some((lesson) => (
                        !(mod.lessons ?? []).some((current) => current.documentId === lesson.documentId)
                      )) && (
                        <details>
                          <summary>Attach existing lesson</summary>
                          <form action={attachLessonToModuleAction.bind(null, mod.documentId, returnPath)} className="content-form compact-form">
                            <label>Lesson
                              <select name="lessonDocumentId" required>
                                {allLessons
                                  .filter((lesson) => !(mod.lessons ?? []).some(
                                    (current) => current.documentId === lesson.documentId,
                                  ))
                                  .map((lesson) => (
                                    <option key={lesson.documentId} value={lesson.documentId}>{lesson.title}</option>
                                  ))}
                              </select>
                            </label>
                            <button type="submit">Attach lesson</button>
                          </form>
                        </details>
                      )}

                      <details>
                        <summary>Add lesson</summary>
                        <form action={createLessonAction.bind(null, mod.documentId, returnPath)} className="content-form compact-form">
                          <label>Title<input name="title" required /></label>
                          <label>Order<input name="order" type="number" min="0" defaultValue={(mod.lessons ?? []).length} required /></label>
                          <label>Text<textarea name="content" rows={5} /></label>
                          <label>Video URL<input name="videoUrl" type="text" inputMode="url" placeholder="https://youtu.be/..." /></label>
                          <button type="submit">Add lesson</button>
                        </form>
                      </details>
                    </div>

                    <QuizManagement
                      availableQuizzes={allQuizzes.filter((quiz) => (
                        !(mod.quizzes ?? []).some((current) => current.documentId === quiz.documentId)
                      ))}
                      moduleDocumentId={mod.documentId}
                      returnPath={returnPath}
                    />
                  </div>
                </details>
              ))}

              {allModules.some((module) => (
                !modules.some((current) => current.documentId === module.documentId)
              )) && (
                <details>
                  <summary>Attach existing module</summary>
                  <form action={attachModuleToCourseAction.bind(null, course.documentId, returnPath)} className="content-form compact-form">
                    <label>Module
                      <select name="moduleDocumentId" required>
                        {allModules
                          .filter((module) => !modules.some(
                            (current) => current.documentId === module.documentId,
                          ))
                          .map((module) => (
                            <option key={module.documentId} value={module.documentId}>{module.title}</option>
                          ))}
                      </select>
                    </label>
                    <button type="submit">Attach module</button>
                  </form>
                </details>
              )}

              <details>
                <summary>Add module</summary>
                <form action={createModuleAction.bind(null, course.documentId, returnPath)} className="content-form compact-form">
                  <label>Title<input name="title" required /></label>
                  <label>Order<input name="order" type="number" min="0" defaultValue={modules.length} required /></label>
                  <label>Description<textarea name="description" rows={2} /></label>
                  <button type="submit">Add module</button>
                </form>
              </details>
            </div>

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
        ))}
      </section>
    </>
  );
}
