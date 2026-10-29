import {
  IconBottle, IconBrush, IconDroplet, IconDropletHalf2, IconFlask2, IconHandFinger, IconMask,
  IconSpray, IconSun, IconTool,
  type Icon,
} from '@tabler/icons-react';
import type { StepType } from '@/lib/stepTypes';

export const STEP_TYPE_ICON: Record<StepType, Icon> = {
  cleanse: IconDroplet,
  treat: IconFlask2,
  moisturize: IconDropletHalf2,
  protect: IconSun,
  mask: IconMask,
  massage: IconHandFinger,
  tool: IconTool,
  mist: IconSpray,
  apply: IconBrush,
};

export function StepTypeIcon({ type, size = 18 }: { type: StepType; size?: number }) {
  const I = STEP_TYPE_ICON[type] ?? IconBottle;
  return <I size={size} stroke={1.6} aria-hidden />;
}
