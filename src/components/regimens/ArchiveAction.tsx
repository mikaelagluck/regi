'use client';
import { IconArchive, IconArrowBackUp } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomSheet, Button } from '@/components/atoms';
import { api } from '@/lib/client/api';

/** Archive (with confirmation) / Unarchive. Archiving stops future scheduling; history stays. */
export function ArchiveAction({ id, name, archived, className }: { id: string; name: string; archived: boolean; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function go(next: boolean) {
    setBusy(true);
    await api(`/api/regimens/${id}/archive`, { body: { archived: next } });
    setBusy(false);
    setOpen(false);
    router.push(next ? '/regimens' : `/regimens/${id}`);
    router.refresh();
  }
  if (archived) {
    return (
      <button type="button" className={className} onClick={() => go(false)} disabled={busy}>
        <IconArrowBackUp size={18} aria-hidden /><span>Restore regimen</span>
      </button>
    );
  }
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <IconArchive size={18} aria-hidden /><span>Archive</span>
      </button>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Archive ${name}?`}
        description="It stops showing up on Today from tomorrow. Your history stays, and you can restore it any time."
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="ink" onClick={() => go(true)} loading={busy}>Archive</Button></>}
      />
    </>
  );
}
