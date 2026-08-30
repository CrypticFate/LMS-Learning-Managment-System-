import type { Core } from '@strapi/strapi';

import { MIGRATED_MODULE_TITLE } from './migrate-course-content';

type SeedLesson = {
  title: string;
  content: string;
  order: number;
};

type SeedModule = {
  title: string;
  description: string;
  order: number;
  lessons: SeedLesson[];
};

type SeedCourse = {
  title: string;
  slug: string;
  description: string;
  ownerEmail: string;
  modules: SeedModule[];
};

const COURSES: SeedCourse[] = [
  {
    title: 'Web Development Foundations',
    slug: 'web-development-foundations',
    description:
      'Build a strong foundation in semantic HTML, modern CSS, and browser-based JavaScript.',
    ownerEmail: 'instructor@lms.test',
    modules: [
      {
        title: 'Web Basics',
        description: 'Understand how the web works and build pages with HTML.',
        order: 0,
        lessons: [
          {
            title: 'How the Web Works',
            order: 1,
            content:
              'Learn how browsers, web servers, URLs, HTTP requests, and responses work together to deliver a web page.',
          },
          {
            title: 'Semantic HTML',
            order: 2,
            content:
              'Use meaningful HTML elements to create accessible document structure, forms, navigation, and page content.',
          },
        ],
      },
      {
        title: 'CSS & JavaScript',
        description: 'Style pages and add interactivity with CSS and JS.',
        order: 1,
        lessons: [
          {
            title: 'Responsive CSS Layouts',
            order: 1,
            content:
              'Create adaptable layouts with the box model, Flexbox, Grid, fluid sizing, and focused media queries.',
          },
          {
            title: 'JavaScript Essentials',
            order: 2,
            content:
              'Work with values, functions, arrays, objects, DOM events, and small interactive browser features.',
          },
        ],
      },
    ],
  },
  {
    title: 'Practical TypeScript',
    slug: 'practical-typescript',
    description:
      'Use TypeScript to model application data, prevent common bugs, and build maintainable frontend code.',
    ownerEmail: 'instructor@lms.test',
    modules: [
      {
        title: 'TypeScript Fundamentals',
        description: 'Core concepts of TypeScript type system.',
        order: 0,
        lessons: [
          {
            title: 'TypeScript Mental Model',
            order: 1,
            content:
              'Understand static checking, inference, annotations, compilation, and the boundary between types and runtime values.',
          },
          {
            title: 'Objects, Unions, and Narrowing',
            order: 2,
            content:
              'Model realistic data with object types and unions, then safely narrow values using control flow.',
          },
          {
            title: 'Reusable Generic Functions',
            order: 3,
            content:
              'Create generic helpers that preserve useful type information without weakening code with broad any types.',
          },
        ],
      },
    ],
  },
  {
    title: 'Content Strategy Essentials',
    slug: 'content-strategy-essentials',
    description:
      'Plan useful learning content with clear goals, consistent structure, and an audience-first editorial workflow.',
    ownerEmail: 'manager@lms.test',
    modules: [
      {
        title: 'Planning Content',
        description: 'Define audience, goals, and course structure.',
        order: 0,
        lessons: [
          {
            title: 'Audience and Learning Goals',
            order: 1,
            content:
              'Define the audience, the problem they need to solve, and observable outcomes before producing content.',
          },
          {
            title: 'Structuring a Course',
            order: 2,
            content:
              'Turn a broad topic into a sequence of focused lessons that moves from prerequisite knowledge to application.',
          },
          {
            title: 'Editorial Quality Checklist',
            order: 3,
            content:
              'Review content for accuracy, clarity, accessibility, consistency, useful examples, and actionable next steps.',
          },
        ],
      },
    ],
  },
];

type DemoUser = {
  id: number;
  documentId?: string;
  email: string;
};

async function findDemoUser(
  strapi: Core.Strapi,
  email: string,
): Promise<DemoUser> {
  const user = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { email } });
  if (!user) throw new Error(`Cannot seed demo content: missing ${email}.`);
  return user as DemoUser;
}

export async function seedDemoContent(strapi: Core.Strapi): Promise<void> {
  const courseBySlug = new Map<string, { documentId: string }>();

  for (const seed of COURSES) {
    const owner = await findDemoUser(strapi, seed.ownerEmail);
    const existing = await strapi.documents('api::course.course').findMany({
      filters: { slug: { $eq: seed.slug } },
      limit: 1,
    });
    const course = existing[0] ?? await strapi.documents('api::course.course').create({
      data: {
        title: seed.title,
        slug: seed.slug,
        description: seed.description,
        owner: owner.documentId ?? owner.id,
      } as any,
    });
    courseBySlug.set(seed.slug, course);

    const migratedModules = await strapi.documents('api::module.module').findMany({
      filters: {
        courses: { documentId: { $eq: course.documentId } },
        title: { $eq: MIGRATED_MODULE_TITLE },
      },
      limit: 1,
    });
    // A migrated course already has its legacy lessons/quizzes attached.
    if (migratedModules.length > 0) continue;

    for (const moduleSeed of seed.modules) {
      // Check if module already exists for this course
      const existingModules = await strapi.documents('api::module.module').findMany({
        filters: {
          courses: { documentId: { $eq: course.documentId } },
          title: { $eq: moduleSeed.title },
        },
        limit: 1,
      });
      const module = existingModules[0] ?? await strapi.documents('api::module.module').create({
        data: {
          title: moduleSeed.title,
          description: moduleSeed.description,
          order: moduleSeed.order,
          courses: { connect: [course.documentId] },
        },
      });

      for (const lessonSeed of moduleSeed.lessons) {
        const existingLessons = await strapi.documents('api::lesson.lesson').findMany({
          filters: {
            modules: { documentId: { $eq: module.documentId } },
            title: { $eq: lessonSeed.title },
          },
          limit: 1,
        });
        if (existingLessons.length > 0) continue;

        await strapi.documents('api::lesson.lesson').create({
          data: {
            ...lessonSeed,
            modules: { connect: [module.documentId] },
          },
        });
      }
    }
  }

  const student = await findDemoUser(strapi, 'student@lms.test');
  const enrolledCourse = courseBySlug.get('web-development-foundations');
  if (!enrolledCourse) throw new Error('Cannot seed demo enrollment: course missing.');

  const enrollments = await strapi.documents('api::enrollment.enrollment').findMany({
    filters: {
      student: { id: { $eq: student.id } },
      course: { documentId: { $eq: enrolledCourse.documentId } },
    },
    limit: 1,
  });
  if (enrollments.length === 0) {
    await strapi.documents('api::enrollment.enrollment').create({
      data: {
        student: student.documentId ?? student.id,
        course: enrolledCourse.documentId,
        enrolledAt: new Date().toISOString(),
      } as any,
    });
  }
}
