import { ProfilePage } from '@/features/auth/components/profile-page';
import { ROLE } from '@/lib/constants';

export default function Page() {
  return <ProfilePage allowedRole={ROLE.CONTENT_MANAGER} returnPath="/content-manager/profile" />;
}
