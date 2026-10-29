'use client';
import { IconCircleDashed, IconRefresh, IconCheck } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, ButtonLink } from '@/components/atoms';
import { api } from '@/lib/client/api';
import type { ProductState } from '@/lib/types';

/** Using → "Mark empty" (B4.6 modal). Empty → "Repurchase". Wishlist → "Got it". */
export function ProductStateActions({ id, state }: { id: string; state: ProductState }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  if (state === 'using') {
    return (
      <ButtonLink href={`/products/${id}/finish`} variant="outline" icon={<IconCircleDashed size={16} aria-hidden />}>
        Mark empty
      </ButtonLink>
    );
  }
  const go = async () => {
    setBusy(true);
    if (state === 'empty') await api(`/api/products/${id}/repurchase`, { method: 'POST' });
    else await api(`/api/products/${id}`, { method: 'PATCH', body: { state: 'using' } });
    setBusy(false);
    router.refresh();
  };
  return (
    <Button variant="outline" onClick={go} loading={busy} icon={state === 'empty' ? <IconRefresh size={16} aria-hidden /> : <IconCheck size={16} aria-hidden />}>
      {state === 'empty' ? 'Repurchase' : 'Got it'}
    </Button>
  );
}
