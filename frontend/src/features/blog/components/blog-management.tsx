import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import {
  createBlogPostAction,
  deleteBlogPostAction,
  toggleBlogPostStatusAction,
  updateBlogPostAction,
} from '../actions';
import { getManageableBlogPosts } from '../queries';

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

export async function BlogManagement() {
  const posts = await getManageableBlogPosts();

  return (
    <>
      <Card className="admin-card section-gap">
        <CardHeader>
          <CardTitle>Write a post</CardTitle>
          <CardDescription>Create a draft first, or publish immediately when the article is ready.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createBlogPostAction} className="admin-form-grid">
            <Field label="Title"><Input name="title" required /></Field>
            <Field label="Cover image URL"><Input name="coverImageUrl" type="url" /></Field>
            <Field className="admin-form-span" label="Body"><Textarea name="body" rows={10} required /></Field>
            <Field label="Initial status">
              <Select defaultValue="draft" name="status">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </Select>
            </Field>
            <Button className="self-end justify-self-start" type="submit">Create post</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="admin-card section-gap">
        <CardHeader className="admin-card-header">
          <div>
            <CardTitle>All blog posts</CardTitle>
            <CardDescription>Manage author posts, publishing state, and public links.</CardDescription>
          </div>
          <Badge variant="secondary">{posts.length} posts</Badge>
        </CardHeader>
        <CardContent className="p-0">
          {posts.length === 0 ? (
            <p className="empty-state admin-empty-state">No blog posts yet.</p>
          ) : (
            <div className="admin-table-wrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Post</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((post) => (
                    <TableRow key={post.documentId}>
                      <TableCell>
                        <div className="admin-post-cell">
                          <strong>{post.title}</strong>
                          {post.status === 'published' ? (
                            <Link href={`/blog/${post.slug}`}>View public post</Link>
                          ) : (
                            <span>Draft preview unavailable until published.</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={post.status === 'published' ? 'default' : 'outline'}>
                          {post.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[var(--muted)]">
                        {post.author?.username ?? 'Unknown author'}
                      </TableCell>
                      <TableCell>
                        <div className="admin-row-actions">
                          <form action={toggleBlogPostStatusAction.bind(
                            null,
                            post.documentId,
                            post.status === 'published' ? 'draft' : 'published',
                          )}>
                            <Button variant="outline" size="sm" type="submit">
                              {post.status === 'published' ? 'Unpublish' : 'Publish'}
                            </Button>
                          </form>
                          <form action={deleteBlogPostAction.bind(null, post.documentId)}>
                            <Button className="danger-button" variant="outline" size="sm" type="submit">Delete</Button>
                          </form>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {posts.map((post) => (
        <details className="admin-disclosure admin-edit-panel" key={post.documentId}>
          <summary>Edit: {post.title}</summary>
          <form
            action={updateBlogPostAction.bind(null, post.documentId)}
            className="admin-form-grid"
          >
            <Field label="Title"><Input defaultValue={post.title} name="title" required /></Field>
            <Field label="Cover image URL"><Input defaultValue={post.coverImageUrl ?? ''} name="coverImageUrl" type="url" /></Field>
            <Field className="admin-form-span" label="Body"><Textarea defaultValue={post.body} name="body" rows={10} required /></Field>
            <input name="status" type="hidden" value={post.status} />
            <Button className="admin-form-span justify-self-start" type="submit">Save post</Button>
          </form>
        </details>
      ))}
    </>
  );
}
