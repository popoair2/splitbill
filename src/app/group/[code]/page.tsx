import { GroupPage } from '@/components/GroupPage';

export default async function Group({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <GroupPage groupCode={code.toUpperCase()} />;
}
