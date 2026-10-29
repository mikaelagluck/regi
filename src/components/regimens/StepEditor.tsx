'use client';
import { IconBottle, IconCheck, IconPencil, IconSearch, IconTrash, IconX } from '@tabler/icons-react';
import { useState } from 'react';
import { BottomSheet, Button, Chip, ChipGroup, StepTypeIcon, TextArea, TextAction, TextField, TopBar } from '@/components/atoms';
import { MORE_STEP_TYPES, PRIMARY_STEP_TYPES, STEP_TYPE_LABEL, WAIT_PRESETS, type StepType } from '@/lib/stepTypes';
import { ProductPicker } from './ProductPicker';
import type { DraftStep, PickerProduct } from './types';
import s from './StepEditor.module.css';

interface Props {
  step: DraftStep;
  isNew: boolean;
  products: PickerProduct[];
  onDone: (s: DraftStep) => void;
  onCancel: () => void;
  onRemove?: () => void;
}

/** [step-editor] B5.4 — same screen for add and edit; only "Remove from regimen" differs. */
export function StepEditor({ step, isNew, products, onDone, onCancel, onRemove }: Props) {
  const [d, setD] = useState<DraftStep>(step);
  const [more, setMore] = useState(false);
  const [picker, setPicker] = useState(false);
  const [typing, setTyping] = useState(!step.user_product_id && !!step.free_text_label);
  const [custom, setCustom] = useState(!WAIT_PRESETS.includes(step.wait_seconds_after as (typeof WAIT_PRESETS)[number]));
  const [confirmRemove, setConfirmRemove] = useState(false);
  const product = products.find((p) => p.id === d.user_product_id);
  const valid = !!d.user_product_id || !!d.free_text_label?.trim();
  const moreSelected = MORE_STEP_TYPES.includes(d.step_type);

  const pick = (p: PickerProduct) => {
    setD({ ...d, user_product_id: p.id, free_text_label: null, step_type: p.step_type });
    setTyping(false);
    setPicker(false);
  };

  return (
    <div className={s.screen}>
      <TopBar
        leading={<TextAction onClick={onCancel}>Cancel</TextAction>}
        title={isNew ? 'Add step' : 'Edit step'}
        trailing={<TextAction onClick={() => valid && onDone({ ...d, free_text_label: d.free_text_label?.trim() || null })} disabled={!valid}>Done</TextAction>}
      />
      <div className={s.body}>
        <section className={s.section}>
          <h2 className="t-overline">Step type</h2>
          <ChipGroup label="Step type">
            {PRIMARY_STEP_TYPES.map((t) => (
              <Chip key={t} selected={d.step_type === t} onClick={() => setD({ ...d, step_type: t })}>{STEP_TYPE_LABEL[t]}</Chip>
            ))}
            <Chip selected={moreSelected} onClick={() => setMore(true)}>{moreSelected ? STEP_TYPE_LABEL[d.step_type] : 'More…'}</Chip>
          </ChipGroup>
        </section>

        <section className={s.section}>
          <h2 className="t-overline">What are you using?</h2>
          {product ? (
            <div className={s.selected}>
              <span className={s.thumb}><StepTypeIcon type={product.step_type} /></span>
              <span className={s.selText}>
                <span className="t-overline">{product.brand}</span>
                <span className={s.selName}>{product.name}</span>
              </span>
              <button type="button" className={s.clear} aria-label="Remove product" onClick={() => setD({ ...d, user_product_id: null })}><IconX size={16} aria-hidden /></button>
            </div>
          ) : typing ? (
            <TextField label="Product name" value={d.free_text_label ?? ''} onChange={(e) => setD({ ...d, free_text_label: e.target.value })} placeholder="e.g. Glossier Milky Jelly" autoFocus />
          ) : (
            <div className={s.empty}>
              <IconBottle size={20} stroke={1.5} aria-hidden />
              <span className="t-caption">Pick something from your shelf, or type a name.</span>
            </div>
          )}
          <div className={s.options}>
            <Button variant="outline" size="sm" icon={<IconSearch size={15} aria-hidden />} onClick={() => setPicker(true)}>From my products</Button>
            <Button variant="outline" size="sm" icon={<IconPencil size={15} aria-hidden />} onClick={() => { setTyping(true); setD({ ...d, user_product_id: null }); }}>
              {typing ? 'Typing a name' : 'Don’t have it'}
            </Button>
          </div>
          {!product && !typing && <p className="t-caption">Don&apos;t have it on your shelf? Tap <strong>Don&apos;t have it</strong> and type the product name.</p>}
        </section>

        <section className={s.section}>
          <h2 className="t-overline">Wait before next step</h2>
          <ChipGroup label="Wait before next step">
            {WAIT_PRESETS.map((w) => (
              <Chip key={w} selected={!custom && d.wait_seconds_after === w} onClick={() => { setCustom(false); setD({ ...d, wait_seconds_after: w }); }}>
                {w === 0 ? 'None' : `${w / 60}m`}
              </Chip>
            ))}
            <Chip selected={custom} onClick={() => setCustom(true)}>Custom</Chip>
          </ChipGroup>
          {custom && (
            <TextField
              label="Minutes"
              type="number"
              inputMode="numeric"
              min={0}
              max={120}
              value={String(Math.round(d.wait_seconds_after / 60))}
              onChange={(e) => setD({ ...d, wait_seconds_after: Math.max(0, Math.min(120, Number(e.target.value) || 0)) * 60 })}
            />
          )}
        </section>

        <TextArea label="Notes" optional value={d.notes ?? ''} onChange={(e) => setD({ ...d, notes: e.target.value || null })} placeholder="3–4 drops, neck and chest too" rows={3} />

        {!isNew && onRemove && (
          <Button variant="destructive" icon={<IconTrash size={16} aria-hidden />} onClick={() => setConfirmRemove(true)}>
            Remove from regimen
          </Button>
        )}
      </div>

      <BottomSheet open={more} onClose={() => setMore(false)} title="More step types">
        <ul className={s.moreList}>
          {MORE_STEP_TYPES.map((t: StepType) => (
            <li key={t}>
              <button type="button" className={s.moreItem} onClick={() => { setD({ ...d, step_type: t }); setMore(false); }} aria-pressed={d.step_type === t}>
                <StepTypeIcon type={t} /> <span>{STEP_TYPE_LABEL[t]}</span>
                {d.step_type === t && <IconCheck size={16} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
      <ProductPicker open={picker} onClose={() => setPicker(false)} products={products} stepType={d.step_type} onPick={pick} />
      <BottomSheet
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove this step?"
        description="It’s removed from today on. Days you already logged keep it."
        footer={<><Button variant="ghost" onClick={() => setConfirmRemove(false)}>Cancel</Button><Button variant="ink" onClick={onRemove}>Remove</Button></>}
      />
    </div>
  );
}
