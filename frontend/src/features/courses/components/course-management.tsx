import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
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

function Field({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label: string;
}) {
  return <Label className={className}>{label}{children}</Label>;
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
  const allLessons = uniqueByDocumentId(allModules.flatMap((module) => module.lessons ?? []));
  const allQuizzes = uniqueByDocumentId(
    allModules.flatMap((module) => (module.quizzes ?? []).map((quiz) => ({
      ...quiz,
      questionCount: 0,
    }))),
  );

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <Badge variant="secondary">{eyebrow}</Badge>
          <h1>{title}</h1>
          <p>Create courses, organize modules, edit lessons, and maintain quizzes.</p>
        </div>
        <div className="admin-hero-count">
          <strong>{courses.length}</strong>
          <span>Courses</span>
        </div>
      </section>

      <Card className="admin-card section-gap">
        <CardHeader>
          <CardTitle>Create a course</CardTitle>
          <CardDescription>Add the public-facing course shell before attaching modules and lessons.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createCourseAction.bind(null, returnPath)} className="admin-form-grid">
            <Field label="Title"><Input name="title" required /></Field>
            <Field className="admin-form-span" label="Description"><Textarea name="description" rows={4} /></Field>
            <Field className="admin-form-span" label="Cover image URL"><Input name="coverImageUrl" type="url" /></Field>
            <Button className="admin-form-span justify-self-start" type="submit">Create course</Button>
          </form>
        </CardContent>
      </Card>

      <section className="admin-stack section-gap">
        <div className="admin-section-title">
          <div>
            <Badge variant="outline">Content library</Badge>
            <h2>Courses</h2>
          </div>
          <span className="count-badge">{courses.length}</span>
        </div>

        {courses.length === 0 && <p className="empty-state">No courses yet.</p>}

        {courseDetails.map(({ course, modules, studentProgress }) => (
          <Card className="admin-course-shell" key={course.documentId}>
            <CardHeader className="admin-card-header">
              <div>
                <Badge variant="outline">{course.owner?.username ? `Owner: ${course.owner.username}` : 'Course'}</Badge>
                <CardTitle className="mt-3">{course.title}</CardTitle>
                <CardDescription>{course.description || 'No description provided.'}</CardDescription>
              </div>
              <form action={deleteCourseAction.bind(null, course.documentId, returnPath)}>
                <Button className="danger-button" type="submit" variant="outline">Delete course</Button>
              </form>
            </CardHeader>
            <CardContent className="admin-stack">
              <details className="admin-disclosure">
                <summary>Edit course details</summary>
                <form action={updateCourseAction.bind(null, course.documentId, returnPath)} className="admin-form-grid">
                  <Field label="Title"><Input name="title" defaultValue={course.title} required /></Field>
                  <Field className="admin-form-span" label="Description"><Textarea name="description" rows={3} defaultValue={course.description ?? ''} /></Field>
                  <Field className="admin-form-span" label="Cover image URL"><Input name="coverImageUrl" type="url" defaultValue={course.coverImageUrl ?? ''} /></Field>
                  <Button className="admin-form-span justify-self-start" type="submit">Save course</Button>
                </form>
              </details>

              <div className="module-admin admin-stack">
                <div className="admin-section-title compact">
                  <h3>Modules</h3>
                  <Badge variant="secondary">{modules.length}</Badge>
                </div>

                {modules.map((mod) => (
                  <details className="module-card admin-disclosure" key={mod.documentId}>
                    <summary>
                      <span className="module-order">{mod.order}</span>
                      <span>{mod.title}</span>
                      <span className="module-meta">{mod.lessons?.length ?? 0} lessons</span>
                    </summary>
                    <div className="module-card-content admin-stack">
                      {(mod.courses?.length ?? 0) > 1 && (
                        <form action={detachModuleFromCourseAction.bind(
                          null,
                          course.documentId,
                          mod.documentId,
                          returnPath,
                        )}>
                          <Button type="submit" variant="outline" size="sm">Remove module from this course</Button>
                        </form>
                      )}

                      <details className="admin-disclosure subtle">
                        <summary>Edit module</summary>
                        <form action={updateModuleAction.bind(null, mod.documentId, returnPath)} className="admin-form-grid">
                          <Field label="Title"><Input name="title" defaultValue={mod.title} required /></Field>
                          <Field label="Order"><Input name="order" type="number" min="0" defaultValue={mod.order} required /></Field>
                          <Field className="admin-form-span" label="Description"><Textarea name="description" rows={2} defaultValue={mod.description ?? ''} /></Field>
                          <div className="admin-form-span button-row">
                            <Button type="submit">Save module</Button>
                            <Button className="danger-button" formAction={deleteModuleAction.bind(null, mod.documentId, returnPath)} type="submit" variant="outline">Delete everywhere</Button>
                          </div>
                        </form>
                      </details>

                      <div className="lesson-admin admin-stack">
                        <div className="admin-section-title compact">
                          <h4>Lessons</h4>
                          <Badge variant="secondary">{(mod.lessons ?? []).length}</Badge>
                        </div>
                        {(mod.lessons ?? []).map((lesson) => (
                          <details className="lesson-edit admin-disclosure subtle" key={lesson.documentId}>
                            <summary>{lesson.order}. {lesson.title}</summary>
                            <form action={updateLessonAction.bind(null, lesson.documentId, returnPath)} className="admin-form-grid">
                              <Field label="Title"><Input name="title" defaultValue={lesson.title} required /></Field>
                              <Field label="Order"><Input name="order" type="number" min="0" defaultValue={lesson.order} required /></Field>
                              <Field className="admin-form-span" label="Text"><Textarea name="content" rows={5} defaultValue={lesson.content ?? ''} /></Field>
                              <Field className="admin-form-span" label="Video URL"><Input name="videoUrl" type="text" inputMode="url" placeholder="https://youtu.be/..." defaultValue={lesson.videoUrl ?? ''} /></Field>
                              <div className="admin-form-span button-row">
                                <Button type="submit">Save lesson</Button>
                                {(lesson.modules?.length ?? 0) > 1 && (
                                  <Button
                                    formAction={detachLessonFromModuleAction.bind(
                                      null,
                                      mod.documentId,
                                      lesson.documentId,
                                      returnPath,
                                    )}
                                    type="submit"
                                    variant="outline"
                                  >
                                    Remove from module
                                  </Button>
                                )}
                                <Button className="danger-button" formAction={deleteLessonAction.bind(null, lesson.documentId, returnPath)} type="submit" variant="outline">Delete everywhere</Button>
                              </div>
                            </form>
                          </details>
                        ))}

                        {allLessons.some((lesson) => (
                          !(mod.lessons ?? []).some((current) => current.documentId === lesson.documentId)
                        )) && (
                          <details className="admin-disclosure subtle">
                            <summary>Attach existing lesson</summary>
                            <form action={attachLessonToModuleAction.bind(null, mod.documentId, returnPath)} className="admin-form-grid">
                              <Field label="Lesson">
                                <Select name="lessonDocumentId" required>
                                  {allLessons
                                    .filter((lesson) => !(mod.lessons ?? []).some(
                                      (current) => current.documentId === lesson.documentId,
                                    ))
                                    .map((lesson) => (
                                      <option key={lesson.documentId} value={lesson.documentId}>{lesson.title}</option>
                                    ))}
                                </Select>
                              </Field>
                              <Button className="self-end justify-self-start" type="submit">Attach lesson</Button>
                            </form>
                          </details>
                        )}

                        <details className="admin-disclosure subtle">
                          <summary>Add lesson</summary>
                          <form action={createLessonAction.bind(null, mod.documentId, returnPath)} className="admin-form-grid">
                            <Field label="Title"><Input name="title" required /></Field>
                            <Field label="Order"><Input name="order" type="number" min="0" defaultValue={(mod.lessons ?? []).length} required /></Field>
                            <Field className="admin-form-span" label="Text"><Textarea name="content" rows={5} /></Field>
                            <Field className="admin-form-span" label="Video URL"><Input name="videoUrl" type="text" inputMode="url" placeholder="https://youtu.be/..." /></Field>
                            <Button className="admin-form-span justify-self-start" type="submit">Add lesson</Button>
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
                  <details className="admin-disclosure">
                    <summary>Attach existing module</summary>
                    <form action={attachModuleToCourseAction.bind(null, course.documentId, returnPath)} className="admin-form-grid">
                      <Field label="Module">
                        <Select name="moduleDocumentId" required>
                          {allModules
                            .filter((module) => !modules.some(
                              (current) => current.documentId === module.documentId,
                            ))
                            .map((module) => (
                              <option key={module.documentId} value={module.documentId}>{module.title}</option>
                            ))}
                        </Select>
                      </Field>
                      <Button className="self-end justify-self-start" type="submit">Attach module</Button>
                    </form>
                  </details>
                )}

                <details className="admin-disclosure">
                  <summary>Add module</summary>
                  <form action={createModuleAction.bind(null, course.documentId, returnPath)} className="admin-form-grid">
                    <Field label="Title"><Input name="title" required /></Field>
                    <Field label="Order"><Input name="order" type="number" min="0" defaultValue={modules.length} required /></Field>
                    <Field className="admin-form-span" label="Description"><Textarea name="description" rows={2} /></Field>
                    <Button className="admin-form-span justify-self-start" type="submit">Add module</Button>
                  </form>
                </details>
              </div>

              <details className="student-progress-panel admin-disclosure">
                <summary>Student progress ({studentProgress.length})</summary>
                {studentProgress.length === 0 ? (
                  <p className="muted">No students are enrolled in this course.</p>
                ) : (
                  <div className="admin-table-wrap">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Completed</TableHead>
                          <TableHead>Progress</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentProgress.map((row) => (
                          <TableRow key={row.student.documentId ?? row.student.id}>
                            <TableCell>
                              <strong>{row.student.username}</strong>
                              <span className="block text-xs text-[var(--muted)]">{row.student.email}</span>
                            </TableCell>
                            <TableCell>{row.completed} / {row.totalLessons}</TableCell>
                            <TableCell>
                              <div className="table-progress">
                                <progress max={100} value={row.percent}>{row.percent}%</progress>
                                <span>{row.percent}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </details>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
