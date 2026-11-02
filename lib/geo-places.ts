/**
 * Municipal Geographic Places, City Wards, and Spatial Boundary Definitions
 * for NagarSetu Officer GIS Hotspot Map.
 *
 * Provides curated boundaries for Mangaluru municipal wards, coastal jurisdictions,
 * and intelligent fallback geocoding matching citizen complaint locations.
 */

export interface PlaceBoundary {
  name: string;
  aliases: string[];
  center: [number, number]; // [lat, lng]
  zoom: number;
  bounds: [[number, number], [number, number]]; // [[southWestLat, southWestLng], [northEastLat, northEastLng]]
  polygon?: [number, number][]; // Optional realistic boundary vertices [lat, lng]
  description?: string;
}

/**
 * Curated municipal places, city zones, and wards across Mangaluru (MCC).
 * Coordinates are verified against OpenStreetMap and MCC municipal ward boundaries.
 */
export const CURATED_PLACES: PlaceBoundary[] = [
  {
    name: 'Mangaluru',
    aliases: ['mangalore', 'mangaluru city', 'mcc', 'kudla', 'kodial', 'namma mangaluru', 'mangaluru urban'],
    center: [12.87, 74.845],
    zoom: 13,
    bounds: [
      [12.78, 74.76],
      [13.04, 74.92],
    ],
    polygon: [
      [13.04, 74.78],
      [13.02, 74.83],
      [12.95, 74.89],
      [12.85, 74.92],
      [12.78, 74.88],
      [12.79, 74.83],
      [12.87, 74.81],
      [12.97, 74.77],
      [13.04, 74.78],
    ],
    description: 'Mangaluru City Corporation (MCC) Municipal Jurisdiction',
  },
  {
    name: 'Hampankatta',
    aliases: ['ks rao road', 'light house hill', 'st aloysius', 'wenlock', 'central market'],
    center: [12.8698, 74.843],
    zoom: 15,
    bounds: [
      [12.863, 74.837],
      [12.876, 74.849],
    ],
    polygon: [
      [12.876, 74.84],
      [12.875, 74.849],
      [12.864, 74.848],
      [12.863, 74.838],
      [12.876, 74.84],
    ],
    description: 'Central Commercial District, K.S. Rao Road & Light House Hill',
  },
  {
    name: 'Kadri',
    aliases: ['mallikatte', 'kadri park', 'circuit house', 'kadri temple', 'kambla'],
    center: [12.8856, 74.8562],
    zoom: 15,
    bounds: [
      [12.878, 74.848],
      [12.893, 74.864],
    ],
    polygon: [
      [12.893, 74.852],
      [12.892, 74.864],
      [12.879, 74.863],
      [12.878, 74.849],
      [12.893, 74.852],
    ],
    description: 'Kadri Temple Precinct, Park & Mallikatte Commercial Circle',
  },
  {
    name: 'Lalbagh',
    aliases: ['mcc office', 'ballalbagh', 'mangala stadium', 'mg road mangalore', 'lalbagh circle'],
    center: [12.882, 74.8398],
    zoom: 15,
    bounds: [
      [12.875, 74.832],
      [12.889, 74.846],
    ],
    polygon: [
      [12.889, 74.836],
      [12.888, 74.846],
      [12.876, 74.845],
      [12.875, 74.833],
      [12.889, 74.836],
    ],
    description: 'Mangaluru City Corporation (MCC) HQ & Mangala Stadium Ward',
  },
  {
    name: 'Bejai',
    aliases: ['ksrtc mangalore', 'ksrtc bus stand', 'bharath mall', 'bejai church', 'anegundi'],
    center: [12.8885, 74.845],
    zoom: 15,
    bounds: [
      [12.882, 74.839],
      [12.896, 74.853],
    ],
    polygon: [
      [12.896, 74.842],
      [12.895, 74.853],
      [12.883, 74.851],
      [12.882, 74.84],
      [12.896, 74.842],
    ],
    description: 'KSRTC Inter-City Bus Terminal & Commercial Ward',
  },
  {
    name: 'Car Street & Bunder',
    aliases: ['car street', 'bunder', 'old port', 'venkatramana', 'fish market'],
    center: [12.864, 74.836],
    zoom: 15,
    bounds: [
      [12.858, 74.829],
      [12.87, 74.841],
    ],
    description: 'Heritage Market, Sri Venkatramana Temple & Old Port Wharf',
  },
  {
    name: 'Kankanady',
    aliases: ['pumpwell', 'father muller', 'karavali circle', 'pumpwell flyover'],
    center: [12.865, 74.862],
    zoom: 15,
    bounds: [
      [12.858, 74.854],
      [12.872, 74.869],
    ],
    description: 'Father Muller Hospital, Pumpwell Transit Junction & Healthcare Hub',
  },
  {
    name: 'Surathkal',
    aliases: ['nitk', 'surathkal beach', 'sadashiva', 'surathkal market', 'mukka'],
    center: [13.008, 74.794],
    zoom: 14,
    bounds: [
      [12.99, 74.775],
      [13.025, 74.81],
    ],
    description: 'North Suburb, NITK Engineering Campus & Coastal Industrial Belt',
  },
  {
    name: 'Panambur',
    aliases: ['new mangalore port', 'nmpt', 'baikampady', 'panambur beach'],
    center: [12.955, 74.809],
    zoom: 14,
    bounds: [
      [12.935, 74.795],
      [12.975, 74.825],
    ],
    description: 'Major Sea Port, Panambur Beach & Baikampady Industrial Area',
  },
  {
    name: 'Urwa & Ladyhill',
    aliases: ['urwa market', 'ladyhill', 'chilimbi', 'marigudi', 'mannagudda'],
    center: [12.894, 74.829],
    zoom: 15,
    bounds: [
      [12.885, 74.821],
      [12.902, 74.836],
    ],
    description: 'Residential Ward, Ladyhill Circle & Urwa Market',
  },
  {
    name: 'Pandeshwar & Attavar',
    aliases: ['forum fiza mall', 'mangalore central', 'attavar', 'kmc attavar'],
    center: [12.859, 74.845],
    zoom: 15,
    bounds: [
      [12.85, 74.838],
      [12.865, 74.852],
    ],
    description: 'Mangalore Central Railway Station & Fiza Mall Corridor',
  },
  {
    name: 'Valencia & Falnir',
    aliases: ['valencia', 'falnir', 'mother teresa road', 'koti chennaya'],
    center: [12.861, 74.853],
    zoom: 15,
    bounds: [
      [12.853, 74.846],
      [12.868, 74.859],
    ],
    description: 'Falnir Residential Area & Valencia Healthcare Link',
  },
  {
    name: 'Derlakatte',
    aliases: ['yenepoya', 'ks hegde', 'dharmanagara', 'mangaluru university', 'ullal'],
    center: [12.812, 74.878],
    zoom: 14,
    bounds: [
      [12.795, 74.86],
      [12.83, 74.895],
    ],
    description: 'South Medical Education Corridor & University Enclave',
  },
  {
    name: 'Kottara Chowki',
    aliases: ['kottara', 'infosys mangalore', 'kulur ferry road', 'ashoknagar mangalore'],
    center: [12.905, 74.833],
    zoom: 15,
    bounds: [
      [12.898, 74.825],
      [12.915, 74.842],
    ],
    description: 'Infosys Tech Center & Kulur Flyover Junction',
  },
  {
    name: 'Kavoor & Airport Road',
    aliases: ['kavoor', 'bondel', 'bajpe airport road', 'padavinangady'],
    center: [12.925, 74.855],
    zoom: 14,
    bounds: [
      [12.912, 74.842],
      [12.94, 74.868],
    ],
    description: 'Mangaluru International Airport Arterial Link & Bondel Ward',
  },
  {
    name: 'Bengaluru',
    aliases: ['bangalore', 'capital city'],
    center: [12.9716, 77.5946],
    zoom: 12,
    bounds: [
      [12.834, 77.46],
      [13.143, 77.76],
    ],
    description: 'State Capital (External Jurisdiction)',
  },
];

/**
 * Searches curated municipal places by query string.
 * Supports exact matching, alias matching, and prefix/substring lookups.
 */
export function findPlaceByQuery(query: string): PlaceBoundary | null {
  if (!query || typeof query !== 'string') return null;

  const q = query.trim().toLowerCase();
  if (!q) return null;

  // 1. Exact name match
  const exact = CURATED_PLACES.find((p) => p.name.toLowerCase() === q);
  if (exact) return exact;

  // 2. Exact alias match
  const aliasMatch = CURATED_PLACES.find((p) =>
    p.aliases.some((alias) => alias.toLowerCase() === q)
  );
  if (aliasMatch) return aliasMatch;

  // 3. Substring match (name starts with query, or query contains name)
  const substringName = CURATED_PLACES.find(
    (p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase())
  );
  if (substringName) return substringName;

  // 4. Substring alias match
  const substringAlias = CURATED_PLACES.find((p) =>
    p.aliases.some((alias) => alias.toLowerCase().includes(q) || q.includes(alias.toLowerCase()))
  );
  if (substringAlias) return substringAlias;

  return null;
}

/**
 * Checks whether a given citizen report is geographically located inside
 * or assigned to a searched municipal place boundary.
 */
export function isReportInPlace(
  report: { lat: number; lng: number; address?: string | null },
  place: PlaceBoundary
): boolean {
  if (!place) return false;

  // 1. Coordinate Bounding Box Check
  const [[swLat, swLng], [neLat, neLng]] = place.bounds;
  const inCoordinateBounds =
    report.lat >= swLat && report.lat <= neLat && report.lng >= swLng && report.lng <= neLng;

  if (inCoordinateBounds) return true;

  // 2. Textual Address Match (matches place name or aliases in reported address)
  if (report.address) {
    const addr = report.address.toLowerCase();
    if (addr.includes(place.name.toLowerCase())) return true;
    for (const alias of place.aliases) {
      if (addr.includes(alias.toLowerCase())) return true;
    }
  }

  return false;
}

/**
 * Fallback synthesizer: Constructs a spatial boundary dynamically
 * if an officer searches a specific street or landmark present in the complaint database.
 */
export function synthesizeBoundaryFromReports(
  placeName: string,
  matchingReports: Array<{ lat: number; lng: number }>
): PlaceBoundary | null {
  if (matchingReports.length === 0) return null;

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const r of matchingReports) {
    if (r.lat < minLat) minLat = r.lat;
    if (r.lat > maxLat) maxLat = r.lat;
    if (r.lng < minLng) minLng = r.lng;
    if (r.lng > maxLng) maxLng = r.lng;
  }

  // Add 0.006 degrees (~650m) visual buffer around the matching complaints
  const buffer = 0.006;
  const bounds: [[number, number], [number, number]] = [
    [Number((minLat - buffer).toFixed(5)), Number((minLng - buffer).toFixed(5))],
    [Number((maxLat + buffer).toFixed(5)), Number((maxLng + buffer).toFixed(5))],
  ];

  const centerLat = Number(((minLat + maxLat) / 2).toFixed(5));
  const centerLng = Number(((minLng + maxLng) / 2).toFixed(5));

  return {
    name: placeName,
    aliases: [placeName.toLowerCase()],
    center: [centerLat, centerLng],
    zoom: 14,
    bounds,
    description: `Synthesized boundary enclosing ${matchingReports.length} complaint(s) in "${placeName}"`,
  };
}
