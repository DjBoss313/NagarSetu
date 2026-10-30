/**
 * TypeScript types and status transition definitions for NagarSetu.
 * Derived from specifications in PLAN.md.
 */

// ---------------------------------------------------------------------------
// Status Enums & Transitions
// ---------------------------------------------------------------------------

export const REPORT_STATUSES = [
  'Submitted',
  'Under Review',
  'Assigned',
  'In Progress',
  'Resolved',
  'Rejected',
  'Merged',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

/**
 * Strict status transition rules per PLAN.md:
 * Submitted -> Under Review -> Assigned -> In Progress -> Resolved.
 * Rejected and Merged are allowed from early states (Submitted, Under Review) only.
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  'Submitted': ['Under Review', 'Rejected', 'Merged'],
  'Under Review': ['Assigned', 'Rejected', 'Merged'],
  'Assigned': ['In Progress'],
  'In Progress': ['Resolved'],
  'Resolved': [],
  'Rejected': [],
  'Merged': [],
};

export function isValidStatusTransition(from: ReportStatus, to: ReportStatus): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

// ---------------------------------------------------------------------------
// Priority & Category Types
// ---------------------------------------------------------------------------

export const PRIORITY_LABELS = ['Critical', 'High', 'Medium', 'Low'] as const;
export type PriorityLabel = (typeof PRIORITY_LABELS)[number];

export type SourceType = 'llm' | 'fallback';

export type StatusActor = 'Citizen' | 'Officer' | 'System';

export interface PriorityFactor {
  factor: string;
  points: number;
  reason: string;
}

// ---------------------------------------------------------------------------
// Database Entities
// ---------------------------------------------------------------------------

export interface Report {
  id: number;
  tracking_code: string;
  description: string;
  image_path?: string | null;
  category: string;
  user_category?: string | null;
  ai_category?: string | null;
  lat: number;
  lng: number;
  address?: string | null;
  priority_score: number; // 0 - 100
  priority_label: PriorityLabel;
  priority_factors_json?: string | null; // JSON encoded PriorityFactor[]
  summary?: string | null;
  summary_source: SourceType;
  duplicate_of?: number | null;
  cluster_id?: number | null;
  status: ReportStatus;
  assignee?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistory {
  id: number;
  report_id: number;
  from_status: ReportStatus;
  to_status: ReportStatus;
  note?: string | null;
  actor: StatusActor;
  created_at: string;
}

export interface Cluster {
  id: number;
  centroid_lat: number;
  centroid_lng: number;
  radius_m: number;
  report_count: number;
  top_categories?: string | null; // JSON string or comma-separated list
  brief?: string | null;
  brief_source: SourceType;
  created_at: string;
  updated_at: string;
}
