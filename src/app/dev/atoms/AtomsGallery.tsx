'use client';
import { IconBottle, IconCheckbox, IconMoon, IconPlus, IconShare2, IconSun } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import {
  Badge, BottomSheet, Button, Card, Checkbox, Chip, ChipGroup, Dot, EmptyState, IconAction, Logo, Pill, PillGroup,
  ProgressFill, PropertyRow, Section, Stars, StepRow, StepTypeIcon, StreakCard, Switch, TabBar, TextArea, TextField,
  Toast, TopBar, WaitStrip,
} from '@/components/atoms';
import { STEP_TYPES } from '@/lib/stepTypes';
import s from './gallery.module.css';

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={s.block}>
      <h2 className="t-overline">{title}</h2>
      <div className={s.demo}>{children}</div>
    </section>
  );
}

export function AtomsGallery() {
  const [checked, setChecked] = useState(false);
  const [pill, setPill] = useState(0);
  const [chips, setChips] = useState<string[]>(['Treat']);
  const [sheet, setSheet] = useState(false);
  const [sw, setSw] = useState(true);
  const [rating, setRating] = useState(4);
  const [timerStart] = useState(() => new Date(Date.now() - 150_000).toISOString());

  return (
    <div className={s.page}>
      <TopBar large title="Atoms" trailing={<IconAction label="Add"><IconPlus size={22} /></IconAction>} />
      <div className={s.stack}>
        <Block title="Logo">
          <Logo size="hero" />
          <Logo size="card" />
          <Logo />
        </Block>

        <Block title="Button">
          <Button variant="primary">Create a regimen</Button>
          <Button variant="ink">Save</Button>
          <Button variant="outline">Edit</Button>
          <Button variant="ghost">Skip</Button>
          <Button variant="share" icon={<IconShare2 size={16} />}>Share</Button>
          <Button variant="destructive">Remove from regimen</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="primary" loading>Loading</Button>
          <Button variant="outline" size="sm">Small</Button>
        </Block>

        <Block title="Checkbox">
          <Checkbox checked={checked} onChange={setChecked} label="Toggle demo" />
          <Checkbox checked label="Checked" />
          <Checkbox checked retroactive label="Retroactive" />
          <Checkbox checked={false} disabled label="Disabled" />
        </Block>

        <Block title="Chip">
          <ChipGroup label="Step type">
            {['Cleanse', 'Treat', 'Moisturize', 'Protect'].map((c) => (
              <Chip key={c} selected={chips.includes(c)} onClick={() => setChips((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}>{c}</Chip>
            ))}
          </ChipGroup>
          <Chip onRemove={() => {}}>Treat</Chip>
        </Block>

        <Block title="Pill / Badge">
          <PillGroup label="Regimens">
            <Pill active={pill === 0} onClick={() => setPill(0)} icon={<IconSun size={16} />}>Morning</Pill>
            <Pill active={pill === 1} onClick={() => setPill(1)} icon={<IconMoon size={16} />}>Evening</Pill>
          </PillGroup>
          <div className={s.row}>
            <Badge>Using</Badge>
            <Badge tone="active">In progress</Badge>
            <Badge tone="info">May 12–19</Badge>
            <Badge tone="share">Active</Badge>
            <Badge tone="muted">Revoked</Badge>
          </div>
        </Block>

        <Block title="StreakCard">
          <div className={s.row}>
            <StreakCard kind="streak" value={12} label="Perfect day streak" />
            <StreakCard kind="completed" value={347} label="Regimens completed" />
          </div>
          <div className={s.row}>
            <StreakCard kind="streak" value={13} label="Day streak" delta={1} size="lg" />
            <StreakCard kind="completed" value={0} label="Zero state" size="lg" />
          </div>
        </Block>

        <Block title="ProgressFill">
          <ProgressFill value={0.75} label="3 of 4 done" />
          <ProgressFill value={0} label="none" />
          <ProgressFill value={1} label="all" tone="neutral" />
        </Block>

        <Block title="StepRow">
          <div className={s.col}>
            <StepRow title="Gentle Cleanser" subtitle="Cleanse · CeraVe" checked onToggle={() => {}} onOpen={() => {}} />
            <StepRow title="Retro-logged step" subtitle="Treat · The Ordinary" checked retroactive onToggle={() => {}} />
            <StepRow title="Vitamin C Serum" subtitle="Treat · SkinCeuticals" timer={{ startedAt: timerStart, waitSeconds: 300, nextName: 'Moisturizer' }} onToggle={() => {}} />
            <StepRow title="Moisturizer" subtitle="Moisturize · Cetaphil" active onToggle={() => {}} onMore={() => {}} />
            <StepRow title="SPF 50" subtitle="Protect · Beauty of Joseon" onToggle={() => {}} onOpen={() => {}} />
            <StepRow lead="number" index={0} title="Numbered (detail / share)" subtitle="Cleanse · CeraVe" />
            <WaitStrip>Wait 5 min</WaitStrip>
            <StepRow lead="number" index={1} active title="Active numbered" subtitle="Treat" />
            <StepRow lead="none" title="Builder row" subtitle="Treat · SkinCeuticals" dragHandleProps={{}} onOpen={() => {}} />
          </div>
        </Block>

        <Block title="Dot (calendar states)">
          <div className={s.row}>
            <Dot state="complete" size={12} /> complete
            <Dot state="partial" size={12} /> partial
            <Dot state="skipped" size={12} /> skipped
            <Dot state="none" size={12} /> no data
          </div>
        </Block>

        <Block title="Fields">
          <div className={s.col}>
            <TextField label="Username" prefix="@" placeholder="sarahskincare" hint="Available" />
            <TextField label="Display name" optional placeholder="Sarah Mitchell" />
            <TextArea label="Final thoughts" optional placeholder="Best exfoliant I've tried." />
            <Switch checked={sw} onChange={setSw} label="Wait timer alerts" description="Notify when a wait timer completes" />
            <Stars value={rating} onChange={setRating} size={28} />
            <Stars value={3} />
          </div>
        </Block>

        <Block title="Card / Section / PropertyRow">
          <Card>Plain card</Card>
          <Card tone="filled">Filled card</Card>
          <Card tone="share">Share card (yellow = sharing)</Card>
          <Section title="Properties">
            <Card padded={false}>
              <PropertyRow label="Time of day" value="Morning" onClick={() => {}} />
              <PropertyRow label="For" value="Me" onClick={() => {}} />
            </Card>
          </Section>
        </Block>

        <Block title="Step type icons">
          <div className={s.row}>
            {STEP_TYPES.map((t) => (
              <span key={t} className={s.iconCell}><StepTypeIcon type={t} /> {t}</span>
            ))}
          </div>
        </Block>

        <Block title="Toast">
          <Toast icon="🔥" action={{ label: 'Keep going', onClick: () => {} }}>7 days. You&apos;re on a roll.</Toast>
          <Toast tone="share" icon={<IconShare2 size={16} />}>Link copied.</Toast>
        </Block>

        <Block title="BottomSheet">
          <Button variant="outline" onClick={() => setSheet(true)}>Open sheet</Button>
          <BottomSheet
            open={sheet}
            onClose={() => setSheet(false)}
            title="You still have 4 minutes 23 seconds left on the wait. Continue anyway?"
            footer={<><Button variant="ghost" onClick={() => setSheet(false)}>Cancel</Button><Button variant="primary" onClick={() => setSheet(false)}>Continue</Button></>}
          >
            <p className="t-secondary">Sheets trap focus, close on Esc, scrim tap, or swipe down on the handle.</p>
          </BottomSheet>
        </Block>

        <Block title="EmptyState">
          <div className={s.frame}>
            <EmptyState icon={<IconCheckbox size={28} stroke={1.5} />} title="No regimens yet" body="Set up a regimen and it'll show up here every morning and night." action={<Button variant="primary">Create a regimen</Button>} />
          </div>
          <div className={s.frame}>
            <EmptyState icon={<IconBottle size={28} stroke={1.5} />} title="Add your first product" body="Anything you use — cleansers, serums, SPF, masks, tools." action={<Button variant="primary">Add product</Button>} />
          </div>
        </Block>

        <Block title="TabBar (fixed at bottom of this page)">
          <p className="t-caption">Rendered below.</p>
        </Block>
      </div>
      <Suspense>
        <TabBar />
      </Suspense>
    </div>
  );
}
