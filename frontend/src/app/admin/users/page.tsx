import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoleSelector } from '@/features/admin/components/role-selector';
import { getAdminUsers } from '@/features/admin/queries';

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div className="admin-page">
      <section className="admin-hero">
        <div>
          <Badge variant="secondary">Admin dashboard</Badge>
          <h1>Users and roles</h1>
          <p>Role changes save immediately. The final Admin account cannot be demoted.</p>
        </div>
        <div className="admin-hero-count">
          <strong>{users.length}</strong>
          <span>Total users</span>
        </div>
      </section>

      <Card className="section-gap admin-card">
        <CardHeader className="admin-card-header">
          <div>
            <CardTitle>Team access</CardTitle>
            <CardDescription>Review accounts and adjust each person&apos;s platform role.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="admin-table-wrap">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Current role</TableHead>
                  <TableHead className="w-56">Change role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="admin-user-cell">
                        <span>{user.username.slice(0, 1).toUpperCase()}</span>
                        <strong>{user.username}</strong>
                      </div>
                    </TableCell>
                    <TableCell className="text-[var(--muted)]">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role?.name === 'Admin' ? 'default' : 'outline'}>
                        {user.role?.name ?? 'No role'}
                      </Badge>
                    </TableCell>
                    <TableCell><RoleSelector user={user} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
