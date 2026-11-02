'use client';

import {
  findPlaceByQuery,
  isReportInPlace,
  PlaceBoundary,
  synthesizeBoundaryFromReports,
} from '@/lib/geo-places';
import { Cluster, PriorityLabel, Report } from '@/lib/types';
import { calculateDistanceMeters, formatDistance } from '@/lib/ui';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Fix Leaflet default marker icons for Next.js bundler
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  iconUrl: '/images/leaflet/marker-icon.png',
  shadowUrl: '/images/leaflet/marker-shadow.png',
});

interface OfficerGisMapProps {
  reports: Report[];
  clusters: Cluster[];
}

interface GpsLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

type GpsStatus = 'idle' | 'locating' | 'success' | 'error';

export default function OfficerGisMap({ reports, clusters }: OfficerGisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const gpsLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Device GPS State
  const [gpsLocation, setGpsLocation] = useState<GpsLocation | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsError, setGpsError] = useState<string | null>(null);

  // City & Place Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchedPlace, setSearchedPlace] = useState<PlaceBoundary | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const [filterOnlySearchedCity, setFilterOnlySearchedCity] = useState<boolean>(true);

  // Create custom colored pin icons for priority reports
  const createPriorityIcon = (score: number, label: PriorityLabel) => {
    let bgColor = '#16A34A'; // Low: Green
    if (label === 'Critical') bgColor = '#DC2626'; // Critical: Red
    else if (label === 'High') bgColor = '#EA580C'; // High: Orange
    else if (label === 'Medium') bgColor = '#2563EB'; // Medium: Blue

    const html = `
      <div style="
        background-color: ${bgColor};
        width: 28px;
        height: 28px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 10px;
          font-weight: 800;
          font-family: monospace;
        ">${score}</span>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-priority-pin',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
    });
  };

  // Create custom radar pulse marker icon for Field Officer GPS location
  const createGpsIcon = () => {
    const html = `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          position: absolute;
          width: 34px;
          height: 34px;
          border-radius: 9999px;
          background-color: rgba(37, 99, 235, 0.4);
          animation: ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 20px;
          height: 20px;
          border-radius: 9999px;
          background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
          border: 3px solid #ffffff;
          box-shadow: 0 0 12px rgba(37, 99, 235, 0.8), 0 2px 6px rgba(0,0,0,0.35);
        "></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'officer-device-gps-pin',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  };

  // Map Initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    // Centered around Mangaluru
    const map = L.map(mapContainerRef.current, {
      center: [12.87, 74.845],
      zoom: 13,
      zoomControl: true,
    });

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Dedicated layer groups
    boundaryLayerGroupRef.current = L.layerGroup().addTo(map);
    gpsLayerGroupRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    return () => {
      if (boundaryLayerGroupRef.current) {
        boundaryLayerGroupRef.current.clearLayers();
        boundaryLayerGroupRef.current = null;
      }
      if (gpsLayerGroupRef.current) {
        gpsLayerGroupRef.current.clearLayers();
        gpsLayerGroupRef.current = null;
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Municipal Boundary Layer when searched place changes
  useEffect(() => {
    const layer = boundaryLayerGroupRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;

    layer.clearLayers();

    if (!searchedPlace) return;

    const [[swLat, swLng], [neLat, neLng]] = searchedPlace.bounds;

    // Boundary polygon points: use custom polygon if defined, otherwise rectangular bounds
    const polygonPoints: [number, number][] =
      searchedPlace.polygon || [
        [swLat, swLng],
        [neLat, swLng],
        [neLat, neLng],
        [swLat, neLng],
      ];

    const boundaryLayer = L.polygon(polygonPoints, {
      color: '#2563EB',
      weight: 3.5,
      dashArray: '8, 6',
      fillColor: '#3B82F6',
      fillOpacity: 0.12,
    }).addTo(layer);

    // Calculate count of citizen reports inside this boundary
    const complaintsInBoundary = reports.filter((r) => isReportInPlace(r, searchedPlace));

    // Permanent boundary label in the center/top
    boundaryLayer.bindTooltip(
      `<div style="font-family: sans-serif; font-size: 11px; font-weight: 800; color: #1E40AF; display: flex; align-items: center; gap: 4px;">
        <span>📍</span>
        <span>${searchedPlace.name} Municipal Boundary (${complaintsInBoundary.length} complaints)</span>
      </div>`,
      {
        permanent: true,
        direction: 'center',
        className: 'officer-boundary-tooltip',
      }
    );

    // Interactive popup on boundary click
    boundaryLayer.bindPopup(`
      <div style="font-family: sans-serif; min-width: 210px; font-size: 12px; line-height: 1.4;">
        <div style="font-weight: 800; color: #1D4ED8; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">🏛️</span>
          <span>${searchedPlace.name} Boundary</span>
        </div>
        <div style="color: #475569; font-size: 11px; margin-bottom: 4px;">
          ${searchedPlace.description || 'Designated civic inspection jurisdiction'}
        </div>
        <div style="font-size: 11px; color: #1E293B; font-weight: 700; margin-bottom: 4px;">
          Citizen Reports Inside: <span style="color: #2563EB;">${complaintsInBoundary.length}</span>
        </div>
        <div style="font-size: 10px; color: #64748B;">
          Coordinates: (${swLat.toFixed(3)}, ${swLng.toFixed(3)}) to (${neLat.toFixed(3)}, ${neLng.toFixed(3)})
        </div>
      </div>
    `);

    // Smoothly fly to the searched city boundary
    map.fitBounds(searchedPlace.bounds, {
      padding: [45, 45],
      maxZoom: 15,
      animate: true,
      duration: 1.2,
    });
  }, [searchedPlace, reports]);

  // Update Markers & Cluster Circles whenever reports, filters, or searched city changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Layer group for dynamic items
    const layerGroup = L.layerGroup().addTo(map);

    // 1. Add Hotspot Circles from clusters table (filtered by searched place if city filter active)
    const filteredClusters = clusters.filter((c) => {
      if (searchedPlace && filterOnlySearchedCity) {
        return isReportInPlace({ lat: c.centroid_lat, lng: c.centroid_lng }, searchedPlace);
      }
      return true;
    });

    for (const c of filteredClusters) {
      const circle = L.circle([c.centroid_lat, c.centroid_lng], {
        radius: c.radius_m,
        color: '#7C3AED',
        fillColor: '#8B5CF6',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(layerGroup);

      const topCats = c.top_categories ? JSON.parse(c.top_categories) : [];
      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 220px; font-size: 12px;">
          <div style="font-weight: 800; color: #6D28D9; margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>🔥 Hotspot Cluster #${c.id}</span>
            <span>${c.report_count} reports</span>
          </div>
          <div style="color: #4B5563; margin-bottom: 6px; font-size: 11px;">
            Radius: ${c.radius_m}m | Centroid: (${c.centroid_lat.toFixed(4)}, ${c.centroid_lng.toFixed(4)})
          </div>
          <div style="background: #F3F4F6; padding: 6px 8px; border-radius: 6px; margin-bottom: 6px; font-size: 11px; color: #1F2937;">
            ${c.brief}
          </div>
          <div style="font-size: 11px; color: #6B7280;">
            Top issues: ${topCats.slice(0, 2).join(', ')}
          </div>
          <div style="margin-top: 6px; text-align: right;">
            <a href="/officer/hotspots" style="color: #6D28D9; font-weight: bold; text-decoration: underline;">View Cluster Briefs →</a>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
    }

    // 2. Add Priority-Colored Markers (respecting priority filter AND searched city boundary)
    const filteredReports = reports.filter((r) => {
      if (priorityFilter !== 'All' && r.priority_label !== priorityFilter) return false;
      if (searchedPlace && filterOnlySearchedCity && !isReportInPlace(r, searchedPlace)) {
        return false;
      }
      return true;
    });

    for (const r of filteredReports) {
      const icon = createPriorityIcon(r.priority_score, r.priority_label);
      const marker = L.marker([r.lat, r.lng], { icon }).addTo(layerGroup);

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 220px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: monospace; font-weight: bold; color: #1E293B;">${r.tracking_code}</span>
            <span style="font-weight: bold; font-size: 11px; padding: 2px 6px; border-radius: 4px; background: ${
              r.priority_label === 'Critical' ? '#FEE2E2; color: #B91C1C' : r.priority_label === 'High' ? '#FFEDD5; color: #C2410C' : '#E0E7FF; color: #3730A3'
            };">${r.priority_label} (${r.priority_score})</span>
          </div>
          <div style="font-weight: 600; color: #334155; margin-bottom: 2px;">${r.category}</div>
          <div style="color: #64748B; font-size: 11px; margin-bottom: 6px; line-height: 1.3;">
            ${r.summary || r.description.slice(0, 80) + '...'}
          </div>
          <div style="font-size: 10px; color: #94A3B8; margin-bottom: 8px;">
            📍 ${r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
          </div>
          <div style="text-align: right;">
            <a href="/officer/reports/${r.id}" style="color: #2563EB; font-weight: bold; font-size: 11px; text-decoration: underline;">
              Manage in Officer View →
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('click', () => {
        setSelectedReport(r);
      });
    }

    return () => {
      layerGroup.clearLayers();
    };
  }, [reports, clusters, priorityFilter, searchedPlace, filterOnlySearchedCity]);

  // Update Officer Device GPS Marker & Circle
  useEffect(() => {
    const layer = gpsLayerGroupRef.current;
    if (!layer) return;

    layer.clearLayers();

    if (!gpsLocation) return;

    // 1. Accuracy Circle
    if (gpsLocation.accuracy && gpsLocation.accuracy > 0) {
      L.circle([gpsLocation.lat, gpsLocation.lng], {
        radius: Math.min(gpsLocation.accuracy, 2500),
        color: '#2563EB',
        fillColor: '#3B82F6',
        fillOpacity: 0.14,
        weight: 1.5,
        dashArray: '4, 4',
      }).addTo(layer);
    }

    // 2. Animated Pulse GPS Pin
    const gpsIcon = createGpsIcon();
    const marker = L.marker([gpsLocation.lat, gpsLocation.lng], {
      icon: gpsIcon,
      zIndexOffset: 2500,
    }).addTo(layer);

    const popupHtml = `
      <div style="font-family: sans-serif; min-width: 210px; font-size: 12px; line-height: 1.4;">
        <div style="font-weight: 800; color: #1D4ED8; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 14px;">🛰️</span>
          <span>Field Officer GPS Location</span>
        </div>
        <div style="color: #334155; font-size: 11px; margin-bottom: 3px;">
          Coordinates: <strong>${gpsLocation.lat.toFixed(5)}, ${gpsLocation.lng.toFixed(5)}</strong>
        </div>
        ${
          gpsLocation.accuracy
            ? `<div style="font-size: 10px; color: #64748B; margin-bottom: 4px;">GPS Accuracy: ±${gpsLocation.accuracy} meters</div>`
            : ''
        }
        <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; background: #DCFCE7; color: #15803D; font-weight: 700; padding: 2px 6px; border-radius: 4px;">
          <span style="width: 6px; height: 6px; border-radius: 50%; background: #16A34A;"></span>
          Active Device Signal
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
  }, [gpsLocation]);

  // Handle Place & City Search
  const handleSearchCity = useCallback(
    async (rawQuery: string) => {
      const q = rawQuery.trim();
      if (!q) {
        setSearchedPlace(null);
        setSearchFeedback(null);
        return;
      }

      setIsSearching(true);
      setSearchFeedback(null);

      try {
        // 1. Look up in curated municipal places
        const matchedPlace = findPlaceByQuery(q);
        if (matchedPlace) {
          setSearchedPlace(matchedPlace);
          setIsSearching(false);
          return;
        }

        // 2. Fallback: match complaints in database with this locality/address
        const matchingComplaints = reports.filter(
          (r) => r.address && r.address.toLowerCase().includes(q.toLowerCase())
        );

        if (matchingComplaints.length > 0) {
          const synthesized = synthesizeBoundaryFromReports(q, matchingComplaints);
          if (synthesized) {
            setSearchedPlace(synthesized);
            setIsSearching(false);
            return;
          }
        }

        // 3. Fallback: query OpenStreetMap Nominatim geocoding API
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q + ', Karnataka, India'
        )}&format=json&limit=1`;
        const res = await fetch(nominatimUrl);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const item = data[0];
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);
            const bbox = item.boundingbox; // [minLat, maxLat, minLon, maxLon]

            const bounds: [[number, number], [number, number]] = bbox
              ? [
                  [parseFloat(bbox[0]), parseFloat(bbox[2])],
                  [parseFloat(bbox[1]), parseFloat(bbox[3])],
                ]
              : [
                  [lat - 0.02, lng - 0.02],
                  [lat + 0.02, lng + 0.02],
                ];

            const geocodedPlace: PlaceBoundary = {
              name: item.display_name.split(',')[0].trim() || q,
              aliases: [q.toLowerCase()],
              center: [lat, lng],
              zoom: 13,
              bounds,
              description: item.display_name,
            };

            setSearchedPlace(geocodedPlace);
            setIsSearching(false);
            return;
          }
        }

        // If not found anywhere
        setSearchFeedback(`No city or ward boundary found for "${q}". Showing all municipal areas.`);
      } catch (err) {
        console.warn('Geocoding search error:', err);
        setSearchFeedback(`Could not locate "${q}". Showing all city areas.`);
      } finally {
        setIsSearching(false);
      }
    },
    [reports]
  );

  // Clear City Search & Boundary
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchedPlace(null);
    setSearchFeedback(null);
    setFilterOnlySearchedCity(true);

    if (mapRef.current) {
      mapRef.current.flyTo([12.87, 74.845], 13, {
        animate: true,
        duration: 1.0,
      });
    }
  }, []);

  // Handle Device GPS Geolocation Request
  const handleUseDeviceGps = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your current browser or device.');
      setGpsStatus('error');
      return;
    }

    setGpsStatus('locating');
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        const accuracy = position.coords.accuracy ? Math.round(position.coords.accuracy) : undefined;

        const loc: GpsLocation = {
          lat,
          lng,
          accuracy,
          timestamp: Date.now(),
        };

        setGpsLocation(loc);
        setGpsStatus('success');

        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 15, {
            animate: true,
            duration: 1.2,
          });
        }
      },
      (err) => {
        console.warn('Field officer GPS detection error:', err);
        let message = 'Could not acquire GPS position. Please check your location settings.';
        if (err.code === 1) {
          message = 'Location access permission was denied. Please allow location access in your browser settings to center on your position.';
        } else if (err.code === 2) {
          message = 'Device GPS location is currently unavailable. Ensure device location / GPS is turned on.';
        } else if (err.code === 3) {
          message = 'Location request timed out. Please check signal strength and try again.';
        }
        setGpsError(message);
        setGpsStatus('error');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Reset to Bengaluru City Overview
  const handleResetCityView = useCallback(() => {
    if (mapRef.current) {
      mapRef.current.flyTo([12.87, 74.845], 13, {
        animate: true,
        duration: 1.0,
      });
    }
  }, []);

  // Pan to a specific complaint marker
  const handlePanToReport = useCallback((report: Report) => {
    if (mapRef.current) {
      mapRef.current.flyTo([report.lat, report.lng], 16, {
        animate: true,
        duration: 0.8,
      });
    }
    setSelectedReport(report);
  }, []);

  // Compute Incidents Closest to GPS Location:
  // First shows the searched city complaints, and after that other near complaints show.
  const incidentSections = useMemo(() => {
    // Reference point: GPS location if active, otherwise searched city center, otherwise Mangaluru center
    const refLat = gpsLocation ? gpsLocation.lat : searchedPlace ? searchedPlace.center[0] : 12.87;
    const refLng = gpsLocation ? gpsLocation.lng : searchedPlace ? searchedPlace.center[1] : 74.845;

    // Annotate all reports with distance to the reference point
    const reportsWithDist = reports.map((r) => ({
      ...r,
      distanceMeters: calculateDistanceMeters(refLat, refLng, r.lat, r.lng),
      isInSearchedPlace: searchedPlace ? isReportInPlace(r, searchedPlace) : false,
    }));

    if (searchedPlace) {
      // 1. First: Complaints from the searched city (sorted closest to officer / reference point)
      const searchedCityReports = reportsWithDist
        .filter((r) => r.isInSearchedPlace)
        .sort((a, b) => a.distanceMeters - b.distanceMeters);

      // 2. After that: Other near complaints outside the searched city
      const otherReports = reportsWithDist
        .filter((r) => !r.isInSearchedPlace)
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 4);

      return {
        hasSearchedCity: true,
        searchedCityReports,
        otherReports,
      };
    }

    // No searched city: all reports sorted by distance to GPS / reference point
    const allSorted = [...reportsWithDist].sort((a, b) => a.distanceMeters - b.distanceMeters);
    return {
      hasSearchedCity: false,
      searchedCityReports: [],
      otherReports: allSorted.slice(0, 4),
    };
  }, [reports, gpsLocation, searchedPlace]);

  // Compute Nearest Hotspot Cluster relative to Device GPS
  const nearbyCluster = useMemo(() => {
    if (!gpsLocation || clusters.length === 0) return null;
    const sorted = [...clusters]
      .map((c) => ({
        ...c,
        distanceMeters: calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, c.centroid_lat, c.centroid_lng),
      }))
      .sort((a, b) => a.distanceMeters - b.distanceMeters);
    return sorted[0] || null;
  }, [gpsLocation, clusters]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Controls Card: Search City/Place, GPS Actions, Pin Filters & Legend */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card flex flex-col gap-4">
        {/* Row 1: Search City / Place / Ward Input & Quick Suggestion Pills */}
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
                  ></path>
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearchCity(searchQuery);
                  }
                }}
                placeholder="Search city, ward or area (e.g., Hampankatta, Kadri, Lalbagh, Bejai, Surathkal, Mangaluru)..."
                className="w-full pl-10 pr-24 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
              />
              <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-slate-400 hover:text-slate-600 p-1 text-xs cursor-pointer"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleSearchCity(searchQuery)}
                  disabled={isSearching}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  {isSearching ? '...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Quick Municipal Area Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 sm:py-0 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">Quick:</span>
              {[
                'Mangaluru',
                'Hampankatta',
                'Kadri',
                'Lalbagh',
                'Bejai',
                'Kankanady',
                'Surathkal',
              ].map((placeName) => (
                <button
                  key={placeName}
                  type="button"
                  onClick={() => {
                    setSearchQuery(placeName);
                    handleSearchCity(placeName);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all shrink-0 cursor-pointer ${
                    searchedPlace?.name.toLowerCase() === placeName.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {placeName}
                </button>
              ))}
            </div>
          </div>

          {/* Active Searched City Boundary Pill & Pin Display Toggle */}
          {searchedPlace && (
            <div className="bg-blue-50/90 border border-blue-200 px-4 py-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-base">🏛️</span>
                <span className="font-extrabold text-blue-900">
                  Active Area Boundary: <span className="underline decoration-blue-500">{searchedPlace.name}</span>
                </span>
                <span className="bg-blue-100 text-blue-800 font-mono font-bold px-2 py-0.5 rounded-full text-[11px] border border-blue-200">
                  {incidentSections.searchedCityReports.length} complaint{incidentSections.searchedCityReports.length === 1 ? '' : 's'} inside
                </span>
                {searchedPlace.description && (
                  <span className="text-[11px] text-blue-700 italic hidden md:inline">
                    — {searchedPlace.description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterOnlySearchedCity(!filterOnlySearchedCity)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    filterOnlySearchedCity
                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                      : 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50'
                  }`}
                  title="Toggle whether map displays only complaints from this city or all city complaints"
                >
                  {filterOnlySearchedCity ? '✓ Showing Only Searched Area Pins' : 'Showing All Pins'}
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-[11px] font-bold cursor-pointer transition-all shadow-2xs"
                >
                  ✕ Clear Boundary
                </button>
              </div>
            </div>
          )}

          {searchFeedback && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center justify-between">
              <span>⚠️ {searchFeedback}</span>
              <button
                type="button"
                onClick={() => setSearchFeedback(null)}
                className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Row 2: GPS Actions & Pin Filters */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* GPS Command Buttons */}
          <div className="flex items-center flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleUseDeviceGps}
              disabled={gpsStatus === 'locating'}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2 ${
                gpsStatus === 'locating'
                  ? 'bg-blue-50 text-blue-700 border-blue-200 cursor-wait opacity-80'
                  : gpsStatus === 'success'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-blue-500/20 shadow-md'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white border-orange-500 shadow-orange-500/20'
              }`}
            >
              {gpsStatus === 'locating' ? (
                <>
                  <svg
                    className="animate-spin h-3.5 w-3.5 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Acquiring Device GPS...</span>
                </>
              ) : gpsStatus === 'success' ? (
                <>
                  <span>🎯</span>
                  <span>
                    Re-center GPS {gpsLocation?.accuracy ? `(±${gpsLocation.accuracy}m)` : ''}
                  </span>
                </>
              ) : (
                <>
                  <span>📍</span>
                  <span>Use Device GPS</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResetCityView}
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              title="Reset map view to Mangaluru city overview"
            >
              <span>🏙️</span>
              <span>City View</span>
            </button>
          </div>

          {/* Priority Pin Filters */}
          <div className="flex items-center flex-wrap gap-1.5 text-xs">
            <span className="font-bold text-slate-600 mr-1">Filter Pins:</span>
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-xl border font-medium transition-all cursor-pointer ${
                  priorityFilter === p
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Row 3: Map Legend */}
        <div className="pt-3 border-t border-slate-100 flex items-center flex-wrap gap-3.5 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600 shadow-2xs"></span>
            <span className="text-slate-700">Critical (&gt;=75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 shadow-2xs"></span>
            <span className="text-slate-700">High (50-74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 shadow-2xs"></span>
            <span className="text-slate-700">Medium (25-49)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-600 shadow-2xs"></span>
            <span className="text-slate-700">Low (&lt;25)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-purple-600 bg-purple-200 shadow-2xs"></span>
            <span className="text-slate-700">Hotspot (~300m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow-xs"></span>
            <span className="text-slate-700 font-bold">Your Device GPS</span>
          </div>
          {searchedPlace && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-2.5 border-2 border-dashed border-blue-600 bg-blue-100 rounded-xs"></span>
              <span className="text-blue-900 font-bold">{searchedPlace.name} Boundary</span>
            </div>
          )}
        </div>
      </div>

      {/* GPS Error Banner */}
      {gpsError && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span className="font-semibold">{gpsError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGpsError(null)}
            className="text-amber-700 hover:text-amber-900 font-bold px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active GPS Status & Field Awareness Card */}
      {gpsLocation && (
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 border border-blue-200/80 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm mt-0.5 sm:mt-0">
              📍
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-xs font-extrabold text-blue-950">
                  Field Officer GPS Active
                </span>
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold border border-blue-200">
                  {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}
                </span>
                {gpsLocation.accuracy && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    ±{gpsLocation.accuracy}m Accuracy
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-800 mt-1">
                {nearbyCluster ? (
                  <>
                    Nearest hotspot: <strong className="text-purple-800">Cluster #{nearbyCluster.id}</strong> ({formatDistance(nearbyCluster.distanceMeters)} away).{' '}
                  </>
                ) : null}
                Camera focused on your current device location.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUseDeviceGps}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>🎯</span>
              <span>Re-center GPS</span>
            </button>
            <button
              type="button"
              onClick={handleResetCityView}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>🏙️</span>
              <span>City View</span>
            </button>
          </div>
        </div>
      )}

      {/* Incidents Closest to Your GPS Location:
          First shows the searched city complaints, and after that other near complaints show */}
      {(gpsLocation || searchedPlace) && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-card flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                🛰️ Incidents Closest to Your GPS Location
              </span>
              {searchedPlace && (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                  Prioritizing {searchedPlace.name} ({incidentSections.searchedCityReports.length})
                </span>
              )}
            </div>
            {gpsLocation ? (
              <span className="text-[11px] font-medium text-slate-500">
                Live distances computed from device coordinates ({gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)})
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500">
                Turn on device GPS for live proximity sorting
              </span>
            )}
          </div>

          {/* Section 1: First shows the searched city complaints */}
          {searchedPlace && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                  <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                    1. Complaints in Searched City: {searchedPlace.name} ({incidentSections.searchedCityReports.length})
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
                  Showing First
                </span>
              </div>

              {incidentSections.searchedCityReports.length === 0 ? (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                  No citizen complaints currently filed within {searchedPlace.name} municipal boundary.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {incidentSections.searchedCityReports.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => handlePanToReport(r)}
                      className="p-3.5 rounded-xl border-2 border-blue-300 bg-gradient-to-b from-blue-50/50 to-white hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between gap-2.5 text-xs group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="font-mono font-bold text-slate-800 text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {r.tracking_code}
                          </span>
                          <span className="font-extrabold text-blue-800 bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-full text-[10px]">
                            ⭐ {searchedPlace.name}
                          </span>
                        </div>
                        <div className="font-bold text-slate-900 line-clamp-1">{r.category}</div>
                        <div className="text-slate-600 text-[11px] line-clamp-1 mt-0.5">
                          {r.summary || r.description}
                        </div>
                        <div className="text-slate-400 text-[10px] line-clamp-1 mt-1">
                          📍 {r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-blue-100 text-[10px]">
                        <span className="font-bold text-blue-900">
                          {gpsLocation ? `📍 ${formatDistance(r.distanceMeters)} away` : `Score: ${r.priority_score}`}
                        </span>
                        <span className="text-blue-600 font-bold group-hover:underline">
                          Pan to Pin →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section 2: After that other near complaints should show */}
          {incidentSections.otherReports.length > 0 && (
            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    {searchedPlace ? `2. Other Nearby Complaints Outside ${searchedPlace.name}` : 'Nearby Incidents'}
                  </span>
                </div>
                {searchedPlace && (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                    After Searched City
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {incidentSections.otherReports.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handlePanToReport(r)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/70 transition-all cursor-pointer flex flex-col justify-between gap-2.5 text-xs group shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                          {r.tracking_code}
                        </span>
                        <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full text-[10px]">
                          📍 {formatDistance(r.distanceMeters)} away
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 line-clamp-1">{r.category}</div>
                      <div className="text-slate-500 text-[11px] line-clamp-1 mt-0.5">
                        {r.summary || r.description}
                      </div>
                      <div className="text-slate-400 text-[10px] line-clamp-1 mt-1">
                        📍 {r.address || `${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 text-[10px]">
                      <span className="font-bold text-slate-700">
                        Priority: <span className="text-red-600 font-extrabold">{r.priority_score}</span>
                      </span>
                      <span className="text-blue-600 font-bold group-hover:underline">
                        Pan to Pin →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map Canvas with Floating Quick Actions */}
      <div className="relative w-full h-[600px] rounded-3xl overflow-hidden border border-slate-200/90 shadow-card z-0">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Floating In-Map Quick Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          <button
            type="button"
            onClick={handleUseDeviceGps}
            disabled={gpsStatus === 'locating'}
            title="Use Device GPS / Center on My Location"
            aria-label="Use Device GPS"
            className={`w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-xs shadow-md border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer flex items-center justify-center ${
              gpsStatus === 'success' ? 'ring-2 ring-blue-500 text-blue-600 font-bold' : ''
            }`}
          >
            {gpsStatus === 'locating' ? (
              <svg
                className="animate-spin h-5 w-5 text-blue-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5 text-blue-600"
              >
                <path
                  fillRule="evenodd"
                  d="m11.54 22.351.07.04.028.016a.76.76 0 0 0 .723 0l.028-.015.071-.041a16.975 16.975 0 0 0 1.144-.742 19.58 19.58 0 0 0 2.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 0 0-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 0 0 2.682 2.282 16.975 16.975 0 0 0 1.145.742ZM12 13.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={handleResetCityView}
            title="Reset to Mangaluru City Overview"
            aria-label="Reset to Mangaluru City Overview"
            className="w-10 h-10 rounded-2xl bg-white/95 backdrop-blur-xs shadow-md border border-slate-200 text-slate-700 hover:text-blue-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center text-sm"
          >
            🏙️
          </button>
        </div>

        {reports.length === 0 && (
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-2xs flex items-center justify-center pointer-events-none z-[500]">
            <div className="bg-white/95 px-5 py-3 rounded-xl border border-slate-200 shadow-lg text-xs font-bold text-slate-800 flex items-center gap-2">
              <span>📍</span>
              <span>No complaints currently on file to plot.</span>
            </div>
          </div>
        )}
      </div>

      {/* Selected Report Quick Banner (if clicked) */}
      {selectedReport && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg text-xs border border-slate-200">
                {selectedReport.tracking_code}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {selectedReport.category}
              </span>
              <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-lg">
                Priority: {selectedReport.priority_score} ({selectedReport.priority_label})
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-800 line-clamp-1 font-semibold">
              {selectedReport.summary || selectedReport.description}
            </p>
          </div>

          <Link
            href={`/officer/reports/${selectedReport.id}`}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition-all shrink-0 shadow-xs cursor-pointer"
          >
            Open Report #{selectedReport.id} →
          </Link>
        </div>
      )}
    </div>
  );
}
