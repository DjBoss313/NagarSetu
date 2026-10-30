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

/**
 * Core civic report record representing a submitted citizen complaint.
 */
export interface Report {
  /** Internal database auto-increment ID */
  id: number;
  /** Public non-sequential tracking code (e.g. NS-KO0201) */
  tracking_code: string;
  /** Citizen's textual complaint description */
  description: string;
  /** Relative URL path to uploaded photo evidence if provided */
  image_path?: string | null;
  /** Resolved category assigned via AI triage or user override */
  category: string;
  /** User-selected category at form submission */
  user_category?: string | null;
  /** AI-detected category determined by classification pipeline */
  ai_category?: string | null;
  /** Geographic latitude */
  lat: number;
  /** Geographic longitude */
  lng: number;
  /** Civic street address or landmark */
  address?: string | null;
  /** Deterministic explainable priority score clamped to [0, 100] */
  priority_score: number;
  /** Human-readable priority classification label */
  priority_label: PriorityLabel;
  /** JSON-serialized array of itemized PriorityFactor objects */
  priority_factors_json?: string | null;
  /** Concise 1-2 sentence actionable dispatch summary */
  summary?: string | null;
  /** Source of summary: 'llm' (Gemini) or 'fallback' (rule template) */
  summary_source: SourceType;
  /** Parent report ID if this report was identified or merged as a duplicate */
  duplicate_of?: number | null;
  /** Associated hotspot cluster ID if report is part of a spatial cluster */
  cluster_id?: number | null;
  /** Current lifecycle status */
  status: ReportStatus;
  /** Department, maintenance unit, or field officer assigned */
  assignee?: string | null;
  /** ISO timestamp of report submission */
  created_at: string;
  /** ISO timestamp of last update */
  updated_at: string;
}

/**
 * Audit history entry tracking every lifecycle status transition.
 */
export interface StatusHistory {
  /** Audit log record ID */
  id: number;
  /** Foreign key referencing reports(id) */
  report_id: number;
  /** Previous status before transition */
  from_status: ReportStatus;
  /** New status after transition */
  to_status: ReportStatus;
  /** Officer note or automated system remark */
  note?: string | null;
  /** Initiator of the change: 'Citizen', 'Officer', or 'System' */
  actor: StatusActor;
  /** ISO timestamp of status change */
  created_at: string;
}

/**
 * Geographic hotspot cluster representing 3+ nearby complaints.
 */
export interface Cluster {
  /** Unique cluster ID */
  id: number;
  /** Centroid latitude */
  centroid_lat: number;
  /** Centroid longitude */
  centroid_lng: number;
  /** Cluster bounding radius in meters (~300m) */
  radius_m: number;
  /** Count of active citizen reports inside cluster */
  report_count: number;
  /** JSON array of most frequent civic categories in this cluster */
  top_categories?: string | null;
  /** Synthesized Executive Action Brief for ward engineers */
  brief?: string | null;
  /** Source of action brief: 'llm' (Gemini) or 'fallback' */
  brief_source: SourceType;
  /** ISO timestamp of cluster creation */
  created_at: string;
  /** ISO timestamp of latest cluster update */
  updated_at: string;
}
