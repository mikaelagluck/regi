// Shapes shared by server services, API responses and client components.
import type { LogicalDate } from './logicalDate';
import type { Assignment, TimeOfDay } from './schedule';
import type { StepType } from './stepTypes';

export type ProductState = 'using' | 'empty' | 'wishlist';

export interface Category {
  id: string;
  name: string;
  step_type: StepType;
  display_order: number;
}

export interface Product {
  id: string;
  brand: string;
  name: string;
  category_id: string;
  category_name: string;
  step_type: StepType;
  image_url: string | null;
  state: ProductState;
  star_rating: number | null;
  notes: string | null;
  affiliate_url: string | null;
  started_on: LogicalDate | null;
  finished_on: LogicalDate | null;
  repurchase_count: number;
  created_at: string;
  updated_at: string;
  regimen_ids: string[];
}

export interface ProductHistory {
  id: string;
  started_on: LogicalDate | null;
  finished_on: LogicalDate | null;
  star_rating_at_completion: number | null;
  notes_at_completion: string | null;
  created_at: string;
}

export interface RegimenStep {
  id: string;
  regimen_id: string;
  position: number;
  user_product_id: string | null;
  free_text_label: string | null;
  step_type: StepType;
  wait_seconds_after: number;
  notes: string | null;
  reference_url: string | null;
  active_from: LogicalDate | null;
  active_until: LogicalDate | null;
  // joined
  brand: string | null;
  product_name: string | null;
  image_url: string | null;
}

export interface Regimen {
  id: string;
  name: string;
  time_of_day: TimeOfDay;
  target_user_label: string | null;
  reminder_time: string | null;
  is_archived: boolean;
  cloned_from_regimen_id: string | null;
  created_at: string;
}

export interface RegimenSummary extends Regimen {
  step_count: number;
  schedule: ScheduleSummary;
}

export interface ScheduleSummary {
  /** "Mon, Wed, Fri" · "Every day" · "daily during trip" · "Not scheduled" */
  text: string;
  mode: 'recurring' | 'range' | 'none';
  range?: { from: LogicalDate; to: LogicalDate };
}

export interface RegimenDetail extends Regimen {
  steps: RegimenStep[];
  schedule: ScheduleSummary;
  assignments: Assignment[];
}

/** A step as executed on one logical day (template + per-day overrides). */
export interface DayStep {
  /** regimen_step_id, or "added:<step_instance_id>" for steps added for this day only. */
  key: string;
  regimen_step_id: string | null;
  step_instance_id: string | null;
  label: string;
  brand: string | null;
  step_type: StepType;
  user_product_id: string | null;
  wait_seconds_after: number;
  notes: string | null;
  checked_at: string | null;
  timer_started_at: string | null;
  /** B9.4: checked noticeably after the logical day ended. */
  retroactive: boolean;
}

export interface DayRegimen {
  regimen_id: string;
  name: string;
  time_of_day: TimeOfDay;
  instance_id: string | null;
  completed_at: string | null;
  skipped: boolean;
  journal_note: string | null;
  steps: DayStep[];
  done_count: number;
  total: number;
}

export interface DayPayload {
  date: LogicalDate;
  today: LogicalDate;
  regimens: DayRegimen[];
  streak: number;
  lifetime: number;
  serverNow: string;
  hasAnyRegimen: boolean;
}

export interface CheckResult {
  day: DayPayload;
  /** The regimen instance just transitioned to complete (drives [success-moment]). */
  completed: null | {
    regimen_name: string;
    time_of_day: TimeOfDay;
    day_number: number;
    streak_before: number;
    streak_after: number;
    lifetime_before: number;
    lifetime_after: number;
  };
}

export interface Share {
  id: string;
  share_slug: string;
  entity_type: 'regimen' | 'user_product' | 'products_list';
  entity_id: string;
  entity_name: string;
  description: string | null;
  is_active: boolean;
  view_count: number;
  copy_count: number;
  link_click_count: number;
  created_at: string;
  revoked_at: string | null;
}

export interface PublicShareStep {
  id: string;
  position: number;
  step_type: StepType;
  brand: string | null;
  product_name: string | null;
  label: string;
  wait_seconds_after: number;
  notes: string | null;
  affiliate_url: string | null;
}

export interface PublicShare {
  id: string;
  slug: string;
  entity_type: 'regimen' | 'user_product';
  description: string | null;
  view_count: number;
  copy_count: number;
  created_at: string;
  creator: { username: string; display_name: string | null; avatar_url: string | null };
  regimen?: { name: string; time_of_day: TimeOfDay };
  steps?: PublicShareStep[];
  product?: { brand: string; name: string; category: string; step_type: StepType; star_rating: number | null; affiliate_url: string | null; image_url: string | null };
}

export interface MonthDay {
  date: LogicalDate;
  future: boolean;
  dots: { regimen_id: string; time_of_day: TimeOfDay; state: 'complete' | 'partial' | 'skipped' | 'none' }[];
}

export interface CalendarMonth {
  month: string; // YYYY-MM
  today: LogicalDate;
  streak: number;
  days: MonthDay[];
  hasHistory: boolean;
}

export interface DaySummary {
  date: LogicalDate;
  today: LogicalDate;
  regimens: { regimen_id: string; name: string; time_of_day: TimeOfDay; done: number; total: number; skipped: boolean }[];
  journal: string | null;
}
