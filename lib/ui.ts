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
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Assigned':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Under Review':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Rejected':
      return 'bg-red-50 text-red-700 border-red-200';
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
 * Approximate Bengaluru neighborhood name based on geographic coordinates.
 *
 * @param lat - Geographic latitude
 * @param lng - Geographic longitude
 * @returns Descriptive municipal ward or neighborhood landmark
 */
export function getNeighborhoodName(lat: number, lng: number): string {
  if (lat > 12.965 && lat < 12.975 && lng > 77.595 && lng < 77.61) return 'Central Bengaluru / Museum Rd';
  if (lat > 12.975 && lat < 12.985 && lng > 77.635 && lng < 77.645) return 'Indiranagar (100 Feet Rd)';
  if (lat > 12.93 && lat < 12.94 && lng > 77.62 && lng < 77.63) return 'Koramangala (80 Feet Rd)';
  if (lat > 12.978 && lat < 12.986 && lng > 77.60 && lng < 77.61) return 'Shivajinagar / Bowring Hospital';
  if (lat > 12.955 && lat < 12.965 && lng > 77.645 && lng < 77.655) return 'HAL Airport Road / Manipal';
  if (lat > 12.995 && lat < 13.015 && lng > 77.565 && lng < 77.575) return 'Malleshwaram';
  if (lat > 12.975 && lat < 12.99 && lng > 77.73 && lng < 77.76) return 'Whitefield Corridor';
  return `Ward Area (${lat.toFixed(3)}, ${lng.toFixed(3)})`;
}
