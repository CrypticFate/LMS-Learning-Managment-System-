import Link from 'next/link';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getCurrentUser } from '@/features/auth/session';
import { DASHBOARD_ROUTE_BY_ROLE } from '@/lib/constants';

const courses = [
  {
    title: 'Competitive Programming',
    duration: '12 months',
    description:
      'A step-by-step path from programming basics to advanced competitive programming concepts.',
    features: ['100+ live classes and contests', '1000+ practice problems', 'Job placement guidance'],
    price: '৳4,000',
    batch: 'Batch 8 starts October 22, 2026',
  },
  {
    title: 'Job Interview Preparation',
    duration: '6 months',
    description:
      'A complete roadmap for cracking software engineering interviews at top Bangladeshi tech companies and FAANG-level teams.',
    features: ['80+ live classes and MCQ tests', '400+ LeetCode video solutions', 'Mock interviews'],
    price: '৳6,000',
    batch: 'Next batch starts December 24, 2026',
  },
  {
    title: 'Full-stack ASP.NET',
    duration: '8 months',
    description:
      'Learn C#, .NET 8, Clean Architecture, CQRS, Docker, and AI by building a real Twitter-style clone.',
    features: ['77+ live sessions and one real project', 'Clean Architecture and CQRS', '2 months free internship'],
    price: '৳5,500',
    batch: 'Next batch starts July 5, 2026',
  },
];

const advantages = [
  {
    title: 'Expert Mentor Team',
    text: 'Classes are led by mentors with competitive programming skill and industry experience.',
  },
  {
    title: 'Career-focused Guidance',
    text: 'Interview, job, and growth guidance are built into the learning path.',
  },
  {
    title: 'Professional-grade Courses',
    text: 'Courses follow current industry expectations and focus on skills that are already in demand.',
  },
  {
    title: 'Regular Contests and Practice',
    text: 'Students build consistency through contests, problem solving, quizzes, and performance tracking.',
  },
];

const steps = [
  ['Enroll in your course', 'Get instant dashboard access to lectures, practice problems, and helpful materials.'],
  ['Track real-time progress', 'Use contests, quizzes, and problem solving to measure growth and climb the leaderboard.'],
  ['Learn with mentor support', 'Ask questions, review community discussions, and get unstuck with the support team.'],
];

const faqs = [
  [
    'Who is CPS Academy for?',
    'CPS Academy is for learners who want to learn programming, improve competitive programming, or build industry-ready software engineering skills from beginner to advanced levels.',
  ],
  [
    'Can absolute beginners start?',
    'Yes. The learning paths start from fundamentals and move gradually into advanced concepts, practice, contests, and career preparation.',
  ],
  [
    'What do the courses include?',
    'Live classes, contests, practice problems, quizzes, recorded guidance, project work, and mentor support depending on the course.',
  ],
  [
    'Are there regular contests?',
    'Yes. Contest practice and performance tracking are core parts of the competitive programming journey.',
  ],
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const primaryHref = user ? DASHBOARD_ROUTE_BY_ROLE[user.role.name] : '/courses';

  return (
    <main className="cps-home">
      <section className="cps-hero">
        <div className="cps-hero-copy">
          <Badge variant="secondary">Basic to advanced programming and job-ready prep</Badge>
          <h1>Competitive programming, structured with top-tier mentors.</h1>
          <p>
            CPS Academy gives aspiring programmers a clear path through live classes,
            contests, practice problems, progress tracking, and career-focused guidance.
          </p>
          <div className="cps-actions">
            <Link className={buttonVariants({ size: 'lg' })} href={primaryHref}>
              {user ? 'Open dashboard' : 'Explore courses'}
            </Link>
            <Link className={buttonVariants({ variant: 'outline', size: 'lg' })} href="/register">
              Join 500+ learners
            </Link>
          </div>
        </div>
        <Card className="cps-hero-panel animate-float">
          <CardHeader>
            <Badge variant="outline">Batch 8</Badge>
            <CardTitle>Competitive Programming Course</CardTitle>
            <CardDescription>Zero to Expert with one year of live learning.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="cps-code-line"><span>admission</span><strong>August 15</strong></div>
            <div className="cps-code-line"><span>classes</span><strong>October 22</strong></div>
            <div className="cps-code-line"><span>fee</span><strong>৳4,000</strong></div>
          </CardContent>
        </Card>
      </section>

      <section className="cps-section">
        <div className="cps-section-heading">
          <Badge variant="outline">Courses</Badge>
          <h2>Join the course that matches your next goal.</h2>
        </div>
        <div className="cps-course-grid">
          {courses.map((course, index) => (
            <Card className="cps-course-card animate-rise" key={course.title} style={{ animationDelay: `${index * 90}ms` }}>
              <CardHeader>
                <Badge variant="secondary">{course.duration}</Badge>
                <CardTitle>{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="cps-feature-list">
                  {course.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="justify-between">
                <div>
                  <span className="cps-price">{course.price}</span>
                  <small>{course.batch}</small>
                </div>
                <Link className={buttonVariants({ variant: 'outline', size: 'sm' })} href="/courses">
                  Details
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>

      <section className="cps-band">
        <div>
          <Badge variant="outline">Preparation</Badge>
          <h2>Turn confusion into a solid coding routine.</h2>
        </div>
        <Link className={buttonVariants({ variant: 'secondary' })} href="/courses">
          Enroll now
        </Link>
      </section>

      <section className="cps-section cps-split">
        <div>
          <Badge variant="outline">Why CPS</Badge>
          <h2>Built for learners who want measurable progress.</h2>
          <p>
            The academy combines mentor-led teaching, professional course design,
            contest practice, and career guidance so students know what to learn next.
          </p>
        </div>
        <div className="cps-advantage-grid">
          {advantages.map((item) => (
            <Card key={item.title} className="cps-mini-card">
              <CardHeader>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription>{item.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="cps-section">
        <div className="cps-section-heading">
          <Badge variant="outline">Journey</Badge>
          <h2>Start, practice, and improve inside one learning workflow.</h2>
        </div>
        <div className="cps-step-grid">
          {steps.map(([title, text], index) => (
            <Card key={title} className="cps-step-card">
              <CardHeader>
                <Badge>{String(index + 1).padStart(2, '0')}</Badge>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="cps-stats">
        <div>
          <span>Founded</span>
          <strong>2020</strong>
        </div>
        <div>
          <span>Programmer community</span>
          <strong>500+</strong>
        </div>
        <div>
          <span>Codeforces Expert</span>
          <strong>4</strong>
        </div>
        <div>
          <span>Codeforces Specialist</span>
          <strong>37</strong>
        </div>
        <div>
          <span>Codeforces Pupil</span>
          <strong>122</strong>
        </div>
      </section>

      <section className="cps-section cps-split">
        <div>
          <Badge variant="outline">FAQ</Badge>
          <h2>Simple answers before you enroll.</h2>
          <p>Course, contest, and support expectations in plain English.</p>
        </div>
        <Card className="cps-faq-card">
          <CardContent className="pt-5">
            <Accordion>
              {faqs.map(([question, answer], index) => (
                <AccordionItem key={question} open={index === 0}>
                  <AccordionTrigger>{question}</AccordionTrigger>
                  <AccordionContent>{answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>

      <footer className="cps-footer">
        <Separator />
        <div className="cps-footer-grid">
          <div>
            <Link className="brand" href="/">
              <span className="brand-mark">CPS</span>
              <span>CPS Academy</span>
            </Link>
            <p>Structured competitive programming with top-tier programmers.</p>
            <small>Trade license: TRAD/CHTG/011455/2025</small>
          </div>
          <div>
            <strong>Contact</strong>
            <span>info@cpsacademy.io</span>
            <span>(+88) 01759261490</span>
          </div>
          <div>
            <strong>Explore</strong>
            <Link href="/courses">All courses</Link>
            <Link href="/blog">Learning journal</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
