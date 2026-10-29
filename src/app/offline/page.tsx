import { IconWifiOff } from '@tabler/icons-react';
import { EmptyState } from '@/components/atoms';

export const metadata = { title: 'Offline' };

export default function Offline() {
  return (
    <main id="main">
      <EmptyState icon={<IconWifiOff size={28} stroke={1.5} />} title="You're offline" body="regi needs a connection to load this. Your progress is saved as soon as you're back." />
    </main>
  );
}
