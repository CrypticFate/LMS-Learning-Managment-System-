import { RoleSelector } from '@/features/admin/components/role-selector';
import { getAdminUsers } from '@/features/admin/queries';

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <>
      <p className="eyebrow">Admin dashboard</p>
      <h1>Users and roles</h1>
      <p className="lead">
        Role changes take effect immediately. The final Admin account cannot be
        demoted.
      </p>

      <section className="panel progress-table-wrap section-gap admin-user-table">
        <table className="progress-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Current role</th>
              <th>Change role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.username}</strong></td>
                <td>{user.email}</td>
                <td><span className="status-badge">{user.role?.name ?? 'No role'}</span></td>
                <td><RoleSelector user={user} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
