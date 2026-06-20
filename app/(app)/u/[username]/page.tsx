import { PublicUserProfile } from '@/components/friends/PublicUserProfile';

type PageProps = { params: { username: string } };

export default function UserProfilePage({ params }: PageProps) {
  return <PublicUserProfile username={params.username} />;
}
