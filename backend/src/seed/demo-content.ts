import type { Core } from '@strapi/strapi';

type SeedLesson = {
  title: string;
  content: string;
  order: number;
};

type SeedCourse = {
  title: string;
  slug: string;
  description: string;
  ownerEmail: string;
  lessons: SeedLesson[];
};

const COURSES: SeedCourse[] = [
  {
    title: 'Web Development Foundations',
    slug: 'web-development-foundations',
    description:
      'Build a strong foundation in semantic HTML, modern CSS, and browser-based JavaScript.',
    ownerEmail: 'instructor@lms.test',
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
      {
        title: 'Responsive CSS Layouts',
        order: 3,
        content:
          'Create adaptable layouts with the box model, Flexbox, Grid, fluid sizing, and focused media queries.',
      },
      {
        title: 'JavaScript Essentials',
        order: 4,
        content:
          'Work with values, functions, arrays, objects, DOM events, and small interactive browser features.',
      },
    ],
  },
  {
    title: 'Practical TypeScript',
    slug: 'practical-typescript',
    description:
      'Use TypeScript to model application data, prevent common bugs, and build maintainable frontend code.',
    ownerEmail: 'instructor@lms.test',
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
  {
    title: 'Content Strategy Essentials',
    slug: 'content-strategy-essentials',
    description:
      'Plan useful learning content with clear goals, consistent structure, and an audience-first editorial workflow.',
    ownerEmail: 'manager@lms.test',
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

    for (const lessonSeed of seed.lessons) {
      const lessons = await strapi.documents('api::lesson.lesson').findMany({
        filters: {
          course: { documentId: { $eq: course.documentId } },
          title: { $eq: lessonSeed.title },
        },
        limit: 1,
      });
      if (lessons.length > 0) continue;

      await strapi.documents('api::lesson.lesson').create({
        data: {
          ...lessonSeed,
          course: course.documentId,
        },
      });
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
