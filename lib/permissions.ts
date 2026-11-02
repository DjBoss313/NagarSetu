import { Report } from './types';

/**
 * Application-level Row-Level Security (RLS) and Access Control Policies.
 * NagarSetu uses an embedded SQLite database (`better-sqlite3`). Since SQLite
 * does not feature engine-native RLS (like PostgreSQL), authorization policies
 * are enforced deterministically at the application and API boundary.
 */

export type UserRole = 'citizen' | 'officer' | 'public';

export interface AuthContext {
  role: UserRole;
  actor?: string;
  trackingCode?: string | null;
}

/**
 * Resolves user role from request headers, cookies, or payload.
 *
 * @param roleHeader - Value from 'x-user-role' header
 * @param roleCookie - Value from 'nagarsetu_role' cookie
 * @param actor - Actor string passed in body
 * @returns Resolved UserRole
 */
export function resolveUserRole(
  roleHeader?: string | null,
  roleCookie?: string | null,
  actor?: string | null
): UserRole {
  const normalizedHeader = roleHeader?.toLowerCase().trim();
  const normalizedCookie = roleCookie?.toLowerCase().trim();
  const normalizedActor = actor?.toLowerCase().trim();

  if (
    normalizedHeader === 'officer' ||
    normalizedCookie === 'officer' ||
    normalizedActor === 'officer'
  ) {
    return 'officer';
  }

  if (
    normalizedHeader === 'citizen' ||
    normalizedCookie === 'citizen' ||
    normalizedActor === 'citizen'
  ) {
    return 'citizen';
  }

  return 'public';
}

/**
 * Policy: CREATE (Insert Report)
 * Citizens and officers are both permitted to submit new civic complaints.
 */
export function canCreateReport(role: UserRole): boolean {
  // Public, citizen, and officer can all report civic grievances
  return ['citizen', 'officer', 'public'].includes(role);
}

/**
 * Policy: READ (Select Report Record)
 * - Officers can access any report record across all wards.
 * - Citizens/Public can only read records matching their tracking code.
 *   Prevents IDOR enumeration of internal sequential report IDs.
 */
export function canReadReport(
  role: UserRole,
  report: Pick<Report, 'tracking_code'>,
  trackingCodeProvided?: string | null
): boolean {
  if (role === 'officer') {
    return true;
  }

  if (!trackingCodeProvided) {
    return false;
  }

  return (
    trackingCodeProvided.trim().toUpperCase() ===
    report.tracking_code.trim().toUpperCase()
  );
}

/**
 * Policy: UPDATE (Modify Status, Assignee, or Duplicate Link)
 * - Only officers are authorized to transition complaint status, assign crews,
 *   or confirm/reject duplicate links.
 * - Citizens and unauthenticated public actors are strictly forbidden.
 */
export function canUpdateReport(role: UserRole): boolean {
  return role === 'officer';
}

/**
 * Policy: DELETE (Remove Report Record)
 * - Municipal civic grievances and status audit trails are immutable public records.
 * - Permanent deletion is prohibited for ALL roles (including officers).
 * - Terminated/closed complaints must be transitioned to 'Resolved' or 'Merged' status.
 */
export function canDeleteReport(role?: UserRole): boolean {
  void role;
  return false;
}

/**
 * Sanitizes internal operational metadata when a report is accessed by a citizen.
 * Strips internal employee assignment and internal cluster IDs to protect personnel privacy.
 */
export function sanitizeReportForCitizen(
  report: Report,
  history: Array<{ id: number; from_status: string; to_status: string; note?: string | null; actor: string; created_at: string }>
) {
  return {
    report: {
      id: report.id,
      tracking_code: report.tracking_code,
      description: report.description,
      image_path: report.image_path,
      category: report.category,
      address: report.address,
      lat: report.lat,
      lng: report.lng,
      priority_score: report.priority_score,
      priority_label: report.priority_label,
      priority_factors_json: report.priority_factors_json,
      summary: report.summary,
      summary_source: report.summary_source,
      duplicate_of: report.duplicate_of,
      status: report.status,
      // Mask internal assignee details for citizen privacy
      assignee: report.assignee ? 'Assigned to Municipal Field Crew' : null,
      created_at: report.created_at,
      updated_at: report.updated_at,
    },
    history: history.map((h) => ({
      id: h.id,
      from_status: h.from_status,
      to_status: h.to_status,
      note: h.note ?? null,
      actor: h.actor === 'Officer' ? 'Municipal Operations' : h.actor,
      created_at: h.created_at,
    })),
  };
}
