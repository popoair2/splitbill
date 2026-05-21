import { GroupPage } from '@/components/GroupPage';

export default function Group({ params }: { params: { code: string } }) {
  return <GroupPage groupCode={params.code.toUpperCase()} />;
}
