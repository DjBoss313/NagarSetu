'use client';

import { Cluster, PriorityLabel, Report } from '@/lib/types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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

export default function OfficerGisMap({ reports, clusters }: OfficerGisMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Create custom colored pin icons
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

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    // Centered around Bengaluru
    const map = L.map(mapContainerRef.current, {
      center: [12.9716, 77.5946],
      zoom: 12,
      zoomControl: true,
    });

    // OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Markers & Cluster Circles whenever reports or filters change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Layer group for dynamic items
    const layerGroup = L.layerGroup().addTo(map);

    // 1. Add Hotspot Circles from clusters table
    for (const c of clusters) {
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

    // 2. Add Priority-Colored Markers
    const filtered = reports.filter((r) => {
      if (priorityFilter !== 'All' && r.priority_label !== priorityFilter) return false;
      return true;
    });

    for (const r of filtered) {
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
  }, [reports, clusters, priorityFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Filter Bar & Legend */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Priority Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-bold text-slate-700">Filter Pins:</span>
          {['All', 'Critical', 'High', 'Medium', 'Low'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                priorityFilter === p
                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-bold'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-600"></span>
            <span className="text-slate-600">Critical (&gt;=75)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span className="text-slate-600">High (50-74)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            <span className="text-slate-600">Medium (25-49)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-600"></span>
            <span className="text-slate-600">Low (&lt;25)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full border-2 border-purple-600 bg-purple-200"></span>
            <span className="text-slate-600">Hotspot (~300m)</span>
          </div>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-0">
        <div ref={mapContainerRef} className="w-full h-full" />
      </div>

      {/* Selected Report Quick Banner (if clicked) */}
      {selectedReport && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md text-xs border border-slate-200">
                {selectedReport.tracking_code}
              </span>
              <span className="text-xs font-bold text-slate-700">
                {selectedReport.category}
              </span>
              <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                Priority: {selectedReport.priority_score} ({selectedReport.priority_label})
              </span>
            </div>
            <p className="text-xs text-slate-700 line-clamp-1 font-medium">
              {selectedReport.summary || selectedReport.description}
            </p>
          </div>

          <Link
            href={`/officer/reports/${selectedReport.id}`}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-2xs"
          >
            Open Report #{selectedReport.id} →
          </Link>
        </div>
      )}
    </div>
  );
}
