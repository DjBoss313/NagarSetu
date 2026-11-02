/**
 * Shared UI styling and formatting helpers for NagarSetu.
 * Centralizes badge colors, date formatting, and municipal neighborhood naming
 * to eliminate code duplication across citizen and officer views.
 */

import { PriorityLabel, ReportStatus } from './types';

/**
 * Returns Tailwind CSS badge classes for a given priority label.
 *
 * @param label - Priority level ('Critical' | 'High' | 'Medium' | 'Low')
 * @returns CSS class string for background, text, and border styling
 */
export function getPriorityBadgeClass(label: PriorityLabel): string {
  switch (label) {
    case 'Critical':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'High':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Medium':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  }
}

/**
 * Returns Tailwind CSS badge classes for a given lifecycle report status.
 *
 * @param status - Municipal lifecycle status
 * @returns CSS class string for background, text, and border styling
 */
export function getStatusBadgeClass(status: ReportStatus): string {
  switch (status) {
    case 'Resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Progress':
    case 'Assigned':
    case 'Under Review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Submitted':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'Rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Merged':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Formats an ISO date string into Indian locale display date.
 *
 * @param dateStr - ISO 8601 date string
 * @returns Formatted date string (e.g., '28 Oct' or '28 Oct 2026')
 */
export function formatDateIndian(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Approximate Mangaluru neighborhood name based on geographic coordinates.
 *
 * @param lat - Geographic latitude
 * @param lng - Geographic longitude
 * @returns Descriptive municipal ward or neighborhood landmark
 */
export function getNeighborhoodName(lat: number, lng: number): string {
  if (lat > 12.865 && lat < 12.875 && lng > 74.838 && lng < 74.848) return 'Hampankatta / K.S. Rao Road';
  if (lat > 12.880 && lat < 12.890 && lng > 74.850 && lng < 74.862) return 'Kadri / Mallikatte';
  if (lat > 12.878 && lat < 12.886 && lng > 74.835 && lng < 74.845) return 'Lalbagh / MCC HQ';
  if (lat > 12.885 && lat < 12.895 && lng > 74.842 && lng < 74.852) return 'Bejai / KSRTC Bus Stand';
  if (lat > 12.860 && lat < 12.868 && lng > 74.832 && lng < 74.840) return 'Car Street & Bunder';
  if (lat > 12.860 && lat < 12.870 && lng > 74.858 && lng < 74.868) return 'Kankanady / Pumpwell';
  if (lat > 13.000 && lat < 13.020 && lng > 74.788 && lng < 74.802) return 'Surathkal / NITK';
  if (lat > 12.950 && lat < 12.962 && lng > 74.802 && lng < 74.815) return 'Panambur / New Port';
  if (lat > 12.890 && lat < 12.900 && lng > 74.825 && lng < 74.835) return 'Urwa / Ladyhill';
  if (lat > 12.854 && lat < 12.862 && lng > 74.842 && lng < 74.850) return 'Pandeshwar / Attavar';
  if (lat > 12.805 && lat < 12.820 && lng > 74.870 && lng < 74.885) return 'Derlakatte / Medical City';
  if (lat > 12.920 && lat < 12.932 && lng > 74.850 && lng < 74.860) return 'Kavoor / Airport Road';
  if (lat > 12.900 && lat < 12.910 && lng > 74.828 && lng < 74.838) return 'Kottara Chowki';
  return `Mangaluru Ward Area (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
}

/**
 * Calculates great-circle spatial distance between two coordinate pairs in meters.
 * Uses Haversine formula for fast, accurate client-side and server-side spatial calculations.
 *
 * @param lat1 - Origin latitude
 * @param lon1 - Origin longitude
 * @param lat2 - Destination latitude
 * @param lon2 - Destination longitude
 * @returns Spatial distance in rounded meters
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Formats a metric distance into human-friendly format (e.g. '120m' or '1.4km').
 *
 * @param meters - Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

