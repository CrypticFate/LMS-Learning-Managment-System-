import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  markProblemAttemptedAction,
  markProblemCompleteAction,
} from './actions';
import { getMyProblemProgress, getProblemSets } from './queries';
import type { ProblemSet } from './types';

function groupProblems(problems: ProblemSet[]) {
  const grouped = new Map<string, ProblemSet[]>();
  for (const problem of problems) {
    const current = grouped.get(problem.category) ?? [];
    current.push(problem);
    grouped.set(problem.category, current);
  }
  return Array.from(grouped.entries());
}

function statusLabel(problem: ProblemSet): string {
  if (problem.completedAt) return 'Complete';
  if (problem.attemptedAt) return 'Attempted';
  return 'Not started';
}

function difficultyVariant(difficulty: ProblemSet['difficulty']) {
  return difficulty === 'hard' ? 'default' : 'outline';
}

export async function StudentProblemSetPage() {
  const [problems, progress] = await Promise.all([
    getProblemSets(),
    getMyProblemProgress(),
  ]);
  const grouped = groupProblems(problems);

  return (
    <div className="learning-page problem-set-page">
      <section className="learning-hero">
        <div>
          <Badge variant="secondary">Student dashboard</Badge>
          <h1>Problem Set</h1>
          <p>Practice DSA problems by topic and track completion separately from course lessons.</p>
        </div>
        <div className="admin-hero-count">
          <strong>{progress.percent}%</strong>
          <span>{progress.completed} of {progress.totalProblems} complete</span>
        </div>
      </section>

      <Card className="section-gap">
        <CardHeader>
          <CardTitle>Problem set progress</CardTitle>
          <CardDescription>{progress.attempted} attempted, {progress.completed} completed.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mini-progress problem-set-progress">
            <div>
              <span>{progress.completed} completed</span>
              <strong>{progress.percent}%</strong>
            </div>
            <progress max={100} value={progress.percent}>{progress.percent}%</progress>
          </div>
        </CardContent>
      </Card>

      <div className="problem-category-stack section-gap">
        {grouped.map(([category, categoryProblems]) => {
          const completed = categoryProblems.filter((problem) => problem.completedAt).length;
          const percent = categoryProblems.length === 0
            ? 0
            : Math.round((completed / categoryProblems.length) * 100);

          return (
            <section className="problem-category" key={category}>
              <div className="problem-category-header">
                <div>
                  <h2>{category}</h2>
                  <p>{completed} of {categoryProblems.length} complete</p>
                </div>
                <strong>{percent}%</strong>
              </div>
              <div className="problem-list">
                {categoryProblems.map((problem) => (
                  <Card className="problem-card" key={problem.documentId}>
                    <CardHeader>
                      <div className="problem-card-title-row">
                        <Badge variant={difficultyVariant(problem.difficulty)}>{problem.difficulty}</Badge>
                        <Badge variant="secondary">{statusLabel(problem)}</Badge>
                      </div>
                      <CardTitle>{problem.title}</CardTitle>
                      <CardDescription>{problem.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="button-row problem-actions">
                        <a className={buttonVariants({ variant: 'outline' })} href={problem.problemUrl} rel="noreferrer" target="_blank">
                          Open problem
                        </a>
                        {!problem.attemptedAt && (
                          <form action={markProblemAttemptedAction.bind(null, problem.documentId)}>
                            <Button type="submit">Mark attempted</Button>
                          </form>
                        )}
                        {problem.attemptedAt && !problem.completedAt && (
                          <form action={markProblemCompleteAction.bind(null, problem.documentId)}>
                            <Button type="submit">Mark complete</Button>
                          </form>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
