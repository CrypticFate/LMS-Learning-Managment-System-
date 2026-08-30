import { ProfileForm, StudentProfileForm } from '@/features/auth/components/profile-form';
import { getCurrentUser } from '@/features/auth/session';
import { renderForRoles } from '@/features/auth/components/role-guard';
import { getMyQuizAttempts } from '@/features/quiz/queries';
import { ROLE, type RoleName } from '@/lib/constants';

export async function ProfilePage({ allowedRole, returnPath }: { allowedRole: RoleName; returnPath: string }) {
  return renderForRoles([allowedRole], async () => {
    const user = await getCurrentUser();
    if (!user) return null;

    if (user.role.name === ROLE.STUDENT) {
      const attempts = await getMyQuizAttempts();
      const totalSolved = attempts.reduce((sum, attempt) => sum + attempt.score, 0);

      return (
        <section className="student-profile-page">
          <StudentProfileForm user={user} returnPath={returnPath} totalAttempts={totalSolved} />
        </section>
      );
    }

    return (
      <section className="profile-page stack">
        <div className="section-heading profile-heading">
          <div>
            <p className="eyebrow">Account settings</p>
            <h1>My profile</h1>
            <p className="lead">Keep your name and email up to date for dashboard activity and course communication.</p>
          </div>
        </div>
        <ProfileForm user={user} returnPath={returnPath} />
      </section>
    );
  });
}
