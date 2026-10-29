'use client';
import {
  closestCenter, DndContext, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconArrowRight, IconCheck, IconPlus } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BottomSheet, Button, Card, PropertyRow, StepRow, StepTypeIcon, TextAction, TextField, TopBar } from '@/components/atoms';
import { api } from '@/lib/client/api';
import { TIME_OF_DAY_LABEL, TIMES_OF_DAY, type TimeOfDay } from '@/lib/schedule';
import { CUSTOM_STEP_TYPES, SCAFFOLD, SCAFFOLD_HINT, STEP_TYPE_LABEL, type StepType } from '@/lib/stepTypes';
import { formatWait } from '@/lib/timer';
import { TOD_ICON } from '@/components/atoms/todIcons';
import { StepEditor } from './StepEditor';
import type { DraftStep, PickerProduct } from './types';
import s from './RegimenBuilder.module.css';

interface Initial {
  id?: string;
  name: string;
  time_of_day: TimeOfDay;
  target_user_label: string | null;
  steps: DraftStep[];
}

interface Props {
  initial: Initial;
  products: PickerProduct[];
  targetLabels: string[];
}

let seq = 0;
const newKey = () => `new-${Date.now()}-${(seq += 1)}`;

function SortableStep({ step, label, sub, onOpen, waitNext, onEditWait }: { step: DraftStep; label: string; sub: string; onOpen: () => void; waitNext: boolean; onEditWait: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.key });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined, position: 'relative' }} className={isDragging ? s.dragging : undefined}>
      <StepRow lead="none" title={label} subtitle={sub} onOpen={onOpen} dragHandleProps={{ ...attributes, ...listeners }} />
      {step.wait_seconds_after > 0 && waitNext && (
        <div className={s.wait}>
          <span>Wait {formatWait(step.wait_seconds_after)} before next step</span>
          <button type="button" className={s.waitEdit} onClick={onEditWait}>Edit</button>
        </div>
      )}
    </li>
  );
}

/** [regimen-builder-01] / [regimen-builder-empty] — B5.3 Step 1: Build. */
export function RegimenBuilder({ initial, products, targetLabels }: Props) {
  const router = useRouter();
  const editing = !!initial.id;
  const [name, setName] = useState(initial.name);
  const [tod, setTod] = useState<TimeOfDay>(initial.time_of_day);
  const [target, setTarget] = useState<string | null>(initial.target_user_label);
  const [steps, setSteps] = useState<DraftStep[]>(initial.steps);
  const [editor, setEditor] = useState<{ index: number | null; step: DraftStep } | null>(null);
  const [sheet, setSheet] = useState<'tod' | 'for' | 'custom' | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const productOf = (id: string | null) => products.find((p) => p.id === id);
  const labelOf = (st: DraftStep) => productOf(st.user_product_id)?.name ?? st.free_text_label ?? STEP_TYPE_LABEL[st.step_type];
  const subOf = (st: DraftStep) => [STEP_TYPE_LABEL[st.step_type], productOf(st.user_product_id)?.brand].filter(Boolean).join(' · ');
  const scaffoldLeft = SCAFFOLD[tod].filter((t) => !steps.some((st) => st.step_type === t));

  const openNew = (type: StepType) => setEditor({ index: null, step: { key: newKey(), step_type: type, user_product_id: null, free_text_label: null, wait_seconds_after: 0, notes: null } });

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setSteps((list) => arrayMove(list, list.findIndex((x) => x.key === active.id), list.findIndex((x) => x.key === over.id)));
  }

  async function submit() {
    if (!name.trim() || !steps.length) return;
    setBusy(true);
    setError(undefined);
    const body = {
      name: name.trim(),
      time_of_day: tod,
      target_user_label: target,
      steps: steps.map(({ key: _key, ...st }) => st),
    };
    try {
      if (editing) {
        await api(`/api/regimens/${initial.id}`, { method: 'PATCH', body });
        router.replace(`/regimens/${initial.id}`);
      } else {
        const { id } = await api<{ id: string }>('/api/regimens', { body });
        router.replace(`/regimens/${id}/schedule?new=1`);
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (editor) {
    return (
      <StepEditor
        step={editor.step}
        isNew={editor.index === null}
        products={products}
        onCancel={() => setEditor(null)}
        onDone={(st) => {
          setSteps((list) => {
            if (editor.index !== null) return list.map((x, i) => (i === editor.index ? st : x));
            // New scaffold steps slot into the canonical order for this time of day.
            const order = SCAFFOLD[tod];
            const rank = (t: StepType) => (order.includes(t) ? order.indexOf(t) : order.length);
            const at = list.findIndex((x) => rank(x.step_type) > rank(st.step_type));
            return at === -1 || !order.includes(st.step_type) ? [...list, st] : [...list.slice(0, at), st, ...list.slice(at)];
          });
          setEditor(null);
        }}
        onRemove={editor.index !== null ? () => { setSteps((list) => list.filter((_, i) => i !== editor.index)); setEditor(null); } : undefined}
      />
    );
  }

  const TodIcon = TOD_ICON[tod];

  return (
    <div className={s.screen}>
      <TopBar
        leading={<TextAction onClick={() => router.back()}>Cancel</TextAction>}
        trailing={editing ? <TextAction onClick={submit} disabled={!name.trim() || !steps.length || busy}>Save</TextAction> : <span className={s.stepOf}>Step 1 of 2</span>}
        title={editing ? 'Edit steps' : undefined}
      />
      <div className={s.body}>
        <TextField label="Regimen name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Tret Nights" maxLength={60} className={s.nameField} />

        <Card padded={false}>
          <PropertyRow label="Time of day" value={<span className={s.prop}><TodIcon size={15} aria-hidden /> {TIME_OF_DAY_LABEL[tod]}</span>} onClick={() => setSheet('tod')} />
          <PropertyRow label="For" value={target ?? 'Me'} onClick={() => setSheet('for')} />
        </Card>

        <section className={s.steps} aria-labelledby="steps-h">
          <div className={s.stepsHead}>
            <h2 id="steps-h" className="t-overline">Steps</h2>
            {steps.length > 0 && <span className="t-caption">{steps.length} step{steps.length === 1 ? '' : 's'}</span>}
          </div>
          {steps.length === 0 && <p className="t-caption">Tap a slot below to add a product. Skip any you don&apos;t use.</p>}

          {steps.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}
              accessibility={{ screenReaderInstructions: { draggable: 'To reorder a step, press space or enter on its handle, use the arrow keys to move it, then press space or enter again to drop it.' } }}>
              <SortableContext items={steps.map((x) => x.key)} strategy={verticalListSortingStrategy}>
                <ol className={s.list}>
                  {steps.map((st, i) => (
                    <SortableStep key={st.key} step={st} label={labelOf(st)} sub={subOf(st)} waitNext={i < steps.length - 1}
                      onOpen={() => setEditor({ index: i, step: st })} onEditWait={() => setEditor({ index: i, step: st })} />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}

          {scaffoldLeft.length > 0 && (
            <ul className={s.scaffold} aria-label="Suggested steps">
              {scaffoldLeft.map((t) => (
                <li key={t}>
                  <button type="button" className={s.slot} onClick={() => openNew(t)}>
                    <span className={s.slotIcon}><StepTypeIcon type={t} /></span>
                    <span className={s.slotText}>
                      <span className={s.slotLabel}>{STEP_TYPE_LABEL[t]}</span>
                      <span className="t-caption">{SCAFFOLD_HINT[t]}</span>
                    </span>
                    <IconPlus size={16} aria-hidden className={s.slotPlus} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" className={s.add} onClick={() => (steps.length ? openNew('treat') : setSheet('custom'))}>
            <IconPlus size={16} aria-hidden /> {steps.length ? 'Add step' : 'Add custom step'}
          </button>
        </section>

        {error && <p role="alert" className={s.error}>{error}</p>}
      </div>

      <div className={s.footer}>
        <Button variant="primary" block onClick={submit} disabled={!name.trim() || !steps.length} loading={busy} iconEnd={editing ? undefined : <IconArrowRight size={16} aria-hidden />}>
          {editing ? 'Save steps' : 'Continue to schedule'}
        </Button>
      </div>

      <BottomSheet open={sheet === 'tod'} onClose={() => setSheet(null)} title="Time of day">
        <ul className={s.options}>
          {TIMES_OF_DAY.map((t) => {
            const I = TOD_ICON[t];
            return (
              <li key={t}>
                <button type="button" className={s.option} aria-pressed={tod === t} onClick={() => { setTod(t); setSheet(null); }}>
                  <I size={18} aria-hidden /> <span>{TIME_OF_DAY_LABEL[t]}</span> {tod === t && <IconCheck size={16} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </BottomSheet>

      <BottomSheet open={sheet === 'for'} onClose={() => setSheet(null)} title="Who is this regimen for?">
        <ul className={s.options}>
          {[null, ...targetLabels].map((l) => (
            <li key={l ?? 'me'}>
              <button type="button" className={s.option} aria-pressed={target === l} onClick={() => { setTarget(l); setSheet(null); }}>
                <span>{l ?? 'Me'}</span> {target === l && <IconCheck size={16} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
        <form className={s.newLabel} onSubmit={(e) => { e.preventDefault(); if (newLabel.trim()) { setTarget(newLabel.trim()); setNewLabel(''); setSheet(null); } }}>
          <TextField label="Someone else" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g., Mum" maxLength={40} />
          <Button type="submit" variant="outline" disabled={!newLabel.trim()}>Add</Button>
        </form>
      </BottomSheet>

      <BottomSheet open={sheet === 'custom'} onClose={() => setSheet(null)} title="Add custom step">
        <ul className={s.options}>
          {CUSTOM_STEP_TYPES.map((t) => (
            <li key={t}>
              <button type="button" className={s.option} onClick={() => { setSheet(null); openNew(t); }}>
                <StepTypeIcon type={t} /> <span>{STEP_TYPE_LABEL[t]}</span>
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </div>
  );
}
