import type { TimeOfDay } from './schedule';

export type StepType = 'cleanse' | 'treat' | 'moisturize' | 'protect' | 'mask' | 'massage' | 'tool' | 'mist' | 'apply';

export const STEP_TYPES: StepType[] = ['cleanse', 'treat', 'moisturize', 'protect', 'mask', 'massage', 'tool', 'mist', 'apply'];

/** B9.3: visible chips, then "More…" for the rest. */
export const PRIMARY_STEP_TYPES: StepType[] = ['cleanse', 'treat', 'moisturize', 'mask'];
export const MORE_STEP_TYPES: StepType[] = ['protect', 'massage', 'tool', 'mist', 'apply'];
/** B5.3 "Add custom step" options. */
export const CUSTOM_STEP_TYPES: StepType[] = ['mask', 'massage', 'tool', 'mist', 'apply'];

export const STEP_TYPE_LABEL: Record<StepType, string> = {
  cleanse: 'Cleanse',
  treat: 'Treat',
  moisturize: 'Moisturize',
  protect: 'Protect',
  mask: 'Mask',
  massage: 'Massage',
  tool: 'Tool',
  mist: 'Mist',
  apply: 'Apply',
};

/** B5.3 empty-state scaffold by time of day. */
export const SCAFFOLD: Record<TimeOfDay, StepType[]> = {
  morning: ['cleanse', 'treat', 'moisturize', 'protect'],
  midday: ['treat', 'moisturize', 'protect'],
  evening: ['cleanse', 'treat', 'moisturize'],
};

/** Scaffold-row hints (wireframe regimen-builder-empty). */
export const SCAFFOLD_HINT: Record<StepType, string> = {
  cleanse: 'Tap to add a cleanser',
  treat: 'Serum, retinoid, exfoliant…',
  moisturize: 'Tap to add a moisturizer',
  protect: 'Tap to add an SPF',
  mask: 'Tap to add a mask',
  massage: 'Tap to add a massage step',
  tool: 'Tap to add a tool',
  mist: 'Tap to add a mist',
  apply: 'Tap to add a step',
};

export const WAIT_PRESETS = [0, 60, 300, 600, 1200] as const;
