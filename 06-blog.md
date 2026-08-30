# Plan 06 — Differentiator 4: Blog (Writing & Control)

> **Scope:** Content Manager (and Admin) can write, edit, publish, and delete blog posts (title + body; cover image URL optional). **Draft vs Published** — only published posts are visible to students/public; drafts are not. Anyone can read the published list and open a single post. **Admin has full control over every post (including others'); Content Manager manages the posts they can create.** Builds on Plan 02 (roles, policies) and reuses the auth stack.

---

## 1. Design decision: explicit status enum (not native Draft & Publish)

Model visibility with an explicit `status` enum field (`draft` | `published`) and keep Strapi's native Draft & Publish **disabled** (`"draftAndPublish": false`) on this content-type.

**Why:**
- Full, obvious control over who sees what — public queries hard-filter `status = published`.
- Simple to explain in the video (no v5 dual-version `?status=` semantics).
- The draft→publish flow becomes a plain field update you can demo clearly.

---

## 2. Data model

### `BlogPost` — `api::blog-post.blog-post`
| Field | Type | Notes |
|---|---|---|
| `title` | string, required | |
| `slug` | uid (target `title`), required | public URL; unique |
| `body` | richtext (or long text) | post content |
| `coverImageUrl` | string | optional URL |
| `status` | enumeration `["draft","published"]`, default `draft` | **visibility switch** |
| `author` | relation: manyToOne → User | ownership anchor |
| `publishedAt` | datetime | set when status flips to `published` (our own field; DB column name will differ from Strapi's internal `publishedAt` since native D&P is off — safe) |

`"draftAndPublish": false`.

---

## 3. Endpoints

| Method | Path | Who | Enforcement |
|---|---|---|---|
| GET | `/api/blog-posts` | public | **only `status=published`** (forced server-side) |
| GET | `/api/blog-posts/:slug` | public | published only (author/admin may fetch own draft via the manage endpoint) |
| GET | `/api/blog-posts/mine` | Admin (all) / CM (own) | authenticated + role — includes drafts |
| POST | `/api/blog-posts` | Admin, CM | `has-any-role({Admin, Content Manager})` + author set server-side |
| PUT | `/api/blog-posts/:documentId` | Admin any; CM own | `can-manage-blog` |
| DELETE | `/api/blog-posts/:documentId` | Admin any; CM own | `can-manage-blog` |

> **Critical no-leak rule:** the public list/detail must **never** return drafts. Enforce by overriding the public `find`/`findOne` controllers to inject `status = published`, regardless of any client-supplied filter.

---

## 4. Backend implementation

### 4.1 `can-manage-blog` policy — `src/policies/can-manage-blog.ts`
Admin edits/deletes any post; CM only their own:
```ts
import { ROLE } from '../constants/roles';
export default async (policyContext, _config, { strapi }) => {
  const user = policyContext.state.user;
  const role = user?.role?.name;
  if (!user) return false;
  if (role === ROLE.ADMIN) return true;                          // any post
  if (role !== ROLE.CONTENT_MANAGER) return false;               // instructors/students blocked
  const post = await strapi.documents('api::blog-post.blog-post').findOne({
    documentId: policyContext.params.documentId, populate: { author: true },
  });
  return post?.author?.id === user.id;                           // own only
};
```

### 4.2 Public read — force published
`src/api/blog-post/controllers/blog-post.ts`:
```ts
import { factories } from '@strapi/strapi';

export default factories.createCoreController('api::blog-post.blog-post', ({ strapi }) => ({
  // GET /api/blog-posts  — PUBLIC: published only, no matter what the client asks
  async find(ctx) {
    const posts = await strapi.documents('api::blog-post.blog-post').findMany({
      filters: { status: 'published' },
      populate: { author: true },
      sort: { publishedAt: 'desc' },
    });
    return { data: posts.map(publicShape) };
  },

  // GET /api/blog-posts/:slug  — PUBLIC single published post
  async findOneBySlug(ctx) {
    const [post] = await strapi.documents('api::blog-post.blog-post').findMany({
      filters: { slug: ctx.params.slug, status: 'published' },
      populate: { author: true }, limit: 1,
    });
    if (!post) return ctx.notFound();
    return { data: publicShape(post) };
  },

  // POST /api/blog-posts  — author set server-side; default status = draft
  async create(ctx) {
    ctx.request.body.data = {
      ...ctx.request.body.data,
      author: ctx.state.user.id,
      status: ctx.request.body.data?.status ?? 'draft',
      publishedAt: ctx.request.body.data?.status === 'published' ? new Date() : null,
    };
    return super.create(ctx);
  },

  // PUT /api/blog-posts/:documentId — stamp publishedAt when flipping to published
  async update(ctx) {
    const next = ctx.request.body.data ?? {};
    if (next.status === 'published' && !next.publishedAt) next.publishedAt = new Date();
    // never let the client reassign author
    delete next.author;
    ctx.request.body.data = next;
    return super.update(ctx);
  },

  // GET /api/blog-posts/mine — Admin: all; CM: own. Includes drafts.
  async mine(ctx) {
    const user = ctx.state.user;
    const filters =
      user.role?.name === 'Admin' ? {} : { author: user.id };
    const posts = await strapi.documents('api::blog-post.blog-post').findMany({
      filters, populate: { author: true }, sort: { updatedAt: 'desc' },
    });
    return { data: posts };
  },
}));

function publicShape(p: any) {
  return {
    documentId: p.documentId, title: p.title, slug: p.slug,
    body: p.body, coverImageUrl: p.coverImageUrl, publishedAt: p.publishedAt,
    author: p.author ? { username: p.author.username } : null,
  };
}
```

### 4.3 Routes
`src/api/blog-post/routes/blog-post.ts` (core router) + a custom routes file:
- `find` (public), and a public `GET /api/blog-posts/:slug` → `findOneBySlug` (public).
- `create` → `has-any-role({Admin, Content Manager})`.
- `update`, `delete` → `can-manage-blog`.
- `GET /api/blog-posts/mine` → `has-any-role({Admin, Content Manager})`.

> Make sure the **default** `findOne` (by documentId) that could return a draft isn't left publicly open. Either remove it from public access or route public reads only through `find` + `findOneBySlug` which both force `status=published`.

---

## 5. Frontend (`features/blog/`)

### 5.1 Public
- `/blog` — Server Component lists published posts (`/api/blog-posts`): cover image, title, author, date, excerpt.
- `/blog/[slug]` — single published post (`/api/blog-posts/:slug`). If not found/published → `notFound()`.

### 5.2 Author (CM/Admin) — editor
- `/content-manager/blog` (and `/admin/blog`): list from `/api/blog-posts/mine` (includes drafts, with a **Draft/Published** badge).
- Editor form: title, body (rich text or markdown/textarea), cover image URL, and a **status toggle** (Draft ↔ Published).
- Server Actions `createPost`, `updatePost`, `deletePost`, `togglePublish(documentId, nextStatus)` (JWT via cookie). `revalidatePath('/blog')` after publish so the public list updates.
- CM sees only their own posts; Admin sees all (from `mine`), and can edit/delete any (backend `can-manage-blog` allows Admin).

---

## 6. Edge cases (handle explicitly)
| Case | Expected |
|---|---|
| Public/student requests a draft (list or by slug) | Not returned — public queries force `status=published`. |
| Client adds `?filters[status][$eq]=draft` to the public list | Ignored — controller hard-codes `published`. |
| CM edits/deletes another CM's post | `403` (`can-manage-blog`). |
| Admin edits/deletes any post | Allowed. |
| Instructor/Student tries to create a post | `403` (`has-any-role`). |
| Duplicate slug | `uid` field enforces uniqueness; surface a clean `400`. |
| Publish a post | `status=published`, `publishedAt` stamped; appears in public list. |
| Unpublish (Published → Draft) | Disappears from public list immediately. |
| Client tries to set a different `author` | Ignored — author is the creator; never reassigned on update. |

---

## 7. Acceptance criteria / definition of done
- [ ] `BlogPost` with `title`, `slug`, `body`, `coverImageUrl`, `status`, `author`, `publishedAt`; native D&P off.
- [ ] Public list + single post return **published only** (draft never leaks, even with crafted filters).
- [ ] CM/Admin can create; author set server-side.
- [ ] Draft ↔ Published toggle works and controls public visibility.
- [ ] CM manages own posts; Admin manages every post.
- [ ] Anyone can read the published list and open a post.
- [ ] All §6 edge cases handled.

---

## 8. Video talking points (blog)
1. **Draft→publish flow:** create a draft (show it's absent from `/blog`), flip to Published, show it appear.
2. **No-leak proof:** call the public list with a `status=draft` filter and show drafts still don't come back (server forces published).
3. **Ownership:** show a second CM getting `403` editing the first CM's post, and Admin succeeding on the same post.

---

## Appendix — Full build order & priority (given the tight deadline)

Handout: 24 Aug 2026 · **Deadline: 30 Aug 2026, 11:59 PM**. Prioritize so a working, explainable subset always exists:

1. **Plan 01** — setup + deploy skeleton (get both live early; broken deploys at the end are the #1 failure).
2. **Plan 02** — auth + RBAC + core (courses, enrollment, lessons). *This alone is a passable submission.*
3. **Plan 03** — progress tracking.
4. **Plan 04** — quiz auto-grading.
5. **Plan 05** — admin panel.
6. **Plan 06** — blog.
7. Record the **10-minute video** (mandatory; graded most). Cover: live demo across roles, one feature's data flow, backend permission enforcement (show a 403), progress logic line-by-line, quiz grading in code, admin role change + blog draft→publish, and the Vercel/Railway env setup.

If time runs short, ship fewer differentiators **fully** (with edge cases + video explanation) rather than all of them half-done — the round explicitly rewards depth you can explain over breadth you can't.
