'use client';
import { useEffect, useState } from 'react';
import { Toast, ToastHost } from '@/components/atoms';

const COPY: Record<string, string> = {
  saved: 'Regimen saved. It’ll show up on Today when it’s scheduled.',
  copied: 'Added to your regimens. Use it as-is or edit it for your needs.',
};

export function CreatedToast({ kind }: { kind: string }) {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 4000);
    return () => clearTimeout(t);
  }, []);
  if (!show || !COPY[kind]) return null;
  return (
    <ToastHost>
      <Toast>{COPY[kind]}</Toast>
    </ToastHost>
  );
}
