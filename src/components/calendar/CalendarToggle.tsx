'use client';
import { useRouter } from 'next/navigation';
import { Pill, PillGroup } from '@/components/atoms';

/** Calendar Day / Month toggle (B6.2). */
export function CalendarToggle({ view, date }: { view: 'day' | 'month'; date: string }) {
  const router = useRouter();
  return (
    <PillGroup label="Calendar view">
      <Pill active={view === 'day'} onClick={() => router.push(`/calendar?view=day&date=${date}`)}>Day</Pill>
      <Pill active={view === 'month'} onClick={() => router.push(`/calendar?view=month&month=${date.slice(0, 7)}&date=${date}`)}>Month</Pill>
    </PillGroup>
  );
}
