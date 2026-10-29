import type { StepType } from '@/lib/stepTypes';

export interface DraftStep {
  key: string;
  id?: string;
  step_type: StepType;
  user_product_id: string | null;
  free_text_label: string | null;
  wait_seconds_after: number;
  notes: string | null;
}

export interface PickerProduct {
  id: string;
  brand: string;
  name: string;
  step_type: StepType;
  state: string;
  image_url: string | null;
}
