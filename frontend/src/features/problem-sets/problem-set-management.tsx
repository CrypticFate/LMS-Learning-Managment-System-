'use client';

import { useActionState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  createProblemSetAction,
  deleteProblemSetAction,
  updateProblemSetAction,
} from './actions';
import type { ProblemProgressRecord, ProblemProgressSummary, ProblemSet } from './types';

type ProblemSetManagementProps = {
  title: string;
  eyebrow: string;
  returnPath: string;
  problems: ProblemSet[];
  studentProgress?: ProblemProgressSummary[];
  progressRecords?: ProblemProgressRecord[];
  showProgress?: boolean;
};

const initialState = { ok: false, message: null };

function ProblemCreateForm({ returnPath }: { returnPath: string }) {
  const [state, action] = useActionState(createProblemSetAction.bind(null, returnPath), initialState);

  return (
    <form action={action} className="admin-form-grid problem-form">
      <Label>Title
        <Input name="title" required />
      </Label>
      <Label>Category
        <Input name="category" placeholder="Array" required />
      </Label>
      <Label>Difficulty
        <Select name="difficulty" required defaultValue="medium">
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
      </Label>
      <Label>Order
        <Input min={0} name="order" type="number" defaultValue={0} />
      </Label>
      <Label className="admin-form-span">Problem URL
        <Input name="problemUrl" placeholder="https://practice.geeksforgeeks.org/..." required />
      </Label>
      <Label className="admin-form-span">Description
        <Textarea name="description" rows={3} />
      </Label>
      {state.message && (
        <p className={state.ok ? 'form-success' : 'form-error'}>{state.message}</p>
      )}
      <Button className="admin-form-span justify-self-start" type="submit">Create problem</Button>
    </form>
  );
}

function ProblemEditForm({ problem, returnPath }: { problem: ProblemSet; returnPath: string }) {
  return (
    <form action={updateProblemSetAction.bind(null, problem.documentId, returnPath)} className="admin-form-grid problem-form compact">
      <Label>Title
        <Input defaultValue={problem.title} name="title" required />
      </Label>
      <Label>Category
        <Input defaultValue={problem.category} name="category" required />
      </Label>
      <Label>Difficulty
        <Select name="difficulty" required defaultValue={problem.difficulty}>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </Select>
      </Label>
      <Label>Order
        <Input defaultValue={problem.order} min={0} name="order" type="number" />
      </Label>
      <Label className="admin-form-span">Problem URL
        <Input defaultValue={problem.problemUrl} name="problemUrl" required />
      </Label>
      <Label className="admin-form-span">Description
        <Textarea defaultValue={problem.description ?? ''} name="description" rows={3} />
      </Label>
      <div className="button-row admin-form-span">
        <Button type="submit">Save problem</Button>
        <Button
          className="danger-button"
          formAction={deleteProblemSetAction.bind(null, problem.documentId, returnPath)}
          type="submit"
          variant="outline"
        >
          Delete
        </Button>
      </div>
    </form>
  );
}

function submittedAt(value?: string | null): string {
  if (!value) return 'Not completed';
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function ProblemSetManagement({
  title,
  eyebrow,
  returnPath,
  problems,
  studentProgress = [],
  progressRecords = [],
  showProgress = false,
}: ProblemSetManagementProps) {
  return (
    <div className="admin-page problem-set-page">
      <section className="admin-hero">
        <div>
          <Badge variant="secondary">{eyebrow}</Badge>
          <h1>{title}</h1>
          <p>Manage DSA practice problems and links used by the student Problem Set section.</p>
        </div>
        <div className="admin-hero-count">
          <strong>{problems.length}</strong>
          <span>Problems</span>
        </div>
      </section>

      <Card className="section-gap admin-card">
        <CardHeader>
          <CardTitle>Add problem</CardTitle>
          <CardDescription>Create a category, problem link, and difficulty for student practice.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProblemCreateForm returnPath={returnPath} />
        </CardContent>
      </Card>

      <Card className="section-gap admin-card">
        <CardHeader>
          <CardTitle>Problem library</CardTitle>
          <CardDescription>Edit, reorder, or delete existing problem set entries.</CardDescription>
        </CardHeader>
        <CardContent className="admin-stack">
          {problems.length === 0 ? (
            <p className="empty-state admin-empty-state">No problems have been added yet.</p>
          ) : problems.map((problem) => (
            <details className="admin-disclosure subtle" key={problem.documentId}>
              <summary>{problem.category}: {problem.title}</summary>
              <ProblemEditForm problem={problem} returnPath={returnPath} />
            </details>
          ))}
        </CardContent>
      </Card>

      {showProgress && (
        <Card className="section-gap admin-card">
          <CardHeader>
            <CardTitle>Student problem-set progress</CardTitle>
            <CardDescription>Review each student individually and inspect recent problem activity.</CardDescription>
          </CardHeader>
          <CardContent className="admin-stack">
            <div className="admin-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Student</TableHead><TableHead>Attempted</TableHead><TableHead>Completed</TableHead><TableHead>Progress</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {studentProgress.map((row) => (
                    <TableRow key={row.student.id}>
                      <TableCell><strong>{row.student.username}</strong><br /><small>{row.student.email}</small></TableCell>
                      <TableCell>{row.attempted}</TableCell>
                      <TableCell>{row.completed} / {row.totalProblems}</TableCell>
                      <TableCell><Badge variant={row.percent >= 70 ? 'default' : 'outline'}>{row.percent}%</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <details className="admin-disclosure subtle">
              <summary>Recent problem activity ({progressRecords.length})</summary>
              <div className="admin-table-wrap">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Student</TableHead><TableHead>Problem</TableHead><TableHead>Attempted</TableHead><TableHead>Completed</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {progressRecords.map((row) => (
                      <TableRow key={row.documentId}>
                        <TableCell>{row.student?.username ?? 'Unknown'}</TableCell>
                        <TableCell><strong>{row.problemSet?.title ?? 'Deleted problem'}</strong><br /><small>{row.problemSet?.category}</small></TableCell>
                        <TableCell>{submittedAt(row.attemptedAt)}</TableCell>
                        <TableCell>{submittedAt(row.completedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
