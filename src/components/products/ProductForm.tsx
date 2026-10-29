'use client';
import { IconPhoto, IconTrash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import { BottomSheet, Button, Pill, PillGroup, SelectField, Stars, TextArea, TextField, TextAction, TopBar } from '@/components/atoms';
import { api } from '@/lib/client/api';
import { STATE_LABEL } from '@/lib/productFilters';
import { STEP_TYPE_LABEL, STEP_TYPES } from '@/lib/stepTypes';
import type { Category, Product, ProductState } from '@/lib/types';
import s from './ProductForm.module.css';

interface Props {
  categories: Category[];
  brands: string[];
  product?: Product;
  initialState?: ProductState;
  /** Where to go after saving a new product (e.g. back into the step editor). */
  returnTo?: string;
}

/** B4.8 add / edit product. Changing an existing product to Empty routes to the Finished modal (B4.6). */
export function ProductForm({ categories, brands, product, initialState = 'using', returnTo }: Props) {
  const router = useRouter();
  const listId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({
    brand: product?.brand ?? '',
    name: product?.name ?? '',
    category_id: product?.category_id ?? '',
    state: product?.state ?? initialState,
    image_url: product?.image_url ?? null,
    star_rating: product?.star_rating ?? 0,
    notes: product?.notes ?? '',
    affiliate_url: product?.affiliate_url ?? '',
    started_on: product?.started_on ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const valid = f.brand.trim() && f.name.trim() && f.category_id;

  async function upload(file: File) {
    setUploading(true);
    setError(undefined);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setF((x) => ({ ...x, image_url: data.url }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(undefined);
    const finishing = product && product.state !== 'empty' && f.state === 'empty';
    const payload = {
      ...f,
      state: finishing ? undefined : f.state,
      star_rating: f.star_rating || null,
      notes: f.notes || null,
      affiliate_url: f.affiliate_url || null,
      started_on: f.started_on || null,
    };
    try {
      if (product) {
        await api(`/api/products/${product.id}`, { method: 'PATCH', body: payload });
        if (finishing) router.replace(`/products/${product.id}/finish`);
        else router.replace(`/products/${product.id}`);
      } else {
        const created = await api<Product>('/api/products', { body: payload });
        router.replace(returnTo ? `${returnTo}${returnTo.includes('?') ? '&' : '?'}product=${created.id}` : `/products/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function remove() {
    if (!product) return;
    await api(`/api/products/${product.id}`, { method: 'DELETE' });
    router.replace('/products');
    router.refresh();
  }

  return (
    <form onSubmit={save} noValidate>
      <TopBar
        leading={<TextAction onClick={() => router.back()}>Cancel</TextAction>}
        title={product ? 'Edit product' : 'Add product'}
        trailing={<TextAction type="submit" disabled={!valid || busy}>{busy ? 'Saving…' : 'Save'}</TextAction>}
      />
      <div className={s.body}>
        <div className={s.photoRow}>
          <button type="button" className={s.photo} onClick={() => fileRef.current?.click()} aria-label={f.image_url ? 'Change photo' : 'Add photo'}>
            {f.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={f.image_url} alt="" className={s.photoImg} />
            ) : (
              <IconPhoto size={26} stroke={1.5} aria-hidden />
            )}
          </button>
          <div className={s.photoText}>
            <span className={s.photoLabel}>{uploading ? 'Uploading…' : f.image_url ? 'Photo added' : 'Add a photo'}</span>
            <span className="t-caption">Optional · JPEG, PNG or WebP up to 5 MB</span>
            {f.image_url && (
              <button type="button" className="t-link" onClick={() => setF({ ...f, image_url: null })}>Remove photo</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>

        <TextField label="Brand" required value={f.brand} list={listId} autoComplete="off" onChange={(e) => setF({ ...f, brand: e.target.value })} placeholder="SkinCeuticals" />
        <datalist id={listId}>
          {brands.map((b) => <option key={b} value={b} />)}
        </datalist>
        <TextField label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="CE Ferulic Vitamin C" />
        <SelectField label="Category" required value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
          <option value="" disabled>Choose a category</option>
          {STEP_TYPES.map((t) => (
            <optgroup key={t} label={STEP_TYPE_LABEL[t]}>
              {categories.filter((c) => c.step_type === t).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </optgroup>
          ))}
        </SelectField>

        <div className={s.group}>
          <span className={s.label} id="state-label">State</span>
          <PillGroup label="State">
            {(['using', 'empty', 'wishlist'] as ProductState[]).map((st) => (
              <Pill key={st} active={f.state === st} onClick={() => setF({ ...f, state: st })}>{STATE_LABEL[st]}</Pill>
            ))}
          </PillGroup>
        </div>

        <div className={s.group}>
          <span className={s.label}>Rating <span className={s.optional}>(optional)</span></span>
          <Stars value={f.star_rating} onChange={(v) => setF({ ...f, star_rating: v })} size={26} />
        </div>

        <TextArea label="Notes" optional value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="How you use it, what you think of it…" />
        <TextField label="Where you buy it" optional type="url" inputMode="url" value={f.affiliate_url} onChange={(e) => setF({ ...f, affiliate_url: e.target.value })} placeholder="https://" />
        <TextField label="Started on" optional type="date" value={f.started_on} onChange={(e) => setF({ ...f, started_on: e.target.value })} hint="Leave blank and we'll use the first day you log it." />

        {error && <p role="alert" className={s.error}>{error}</p>}
        <Button type="submit" variant="primary" block disabled={!valid} loading={busy}>
          {product ? 'Save changes' : 'Add product'}
        </Button>
        {product && (
          <Button variant="destructive" icon={<IconTrash size={16} aria-hidden />} onClick={() => setConfirmDelete(true)}>
            Delete product
          </Button>
        )}
      </div>
      <BottomSheet
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={`Delete ${product?.name ?? 'product'}?`}
        description="It will be removed from your shelf. Regimen steps that used it keep their place as unlinked steps."
        footer={<><Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button><Button variant="ink" onClick={remove}>Delete</Button></>}
      />
    </form>
  );
}
