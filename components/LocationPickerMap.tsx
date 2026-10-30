'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

// Fix Leaflet default marker icons for Next.js bundler
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
  iconUrl: '/images/leaflet/marker-icon.png',
  shadowUrl: '/images/leaflet/marker-shadow.png',
});

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  lat,
  lng,
  onChange,
}: LocationPickerMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return; // Initialize only once

    // Create Map
    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
    });

    // Add OpenStreetMap Tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Create Draggable Marker
    const marker = L.marker([lat, lng], { draggable: true }).addTo(map);

    marker.bindPopup('Drag pin or click map to set location').openPopup();

    // Map click handler to move pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newLat = Number(e.latlng.lat.toFixed(5));
      const newLng = Number(e.latlng.lng.toFixed(5));
      marker.setLatLng([newLat, newLng]);
      onChange(newLat, newLng);
    });

    // Marker drag end handler
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      const newLat = Number(position.lat.toFixed(5));
      const newLng = Number(position.lng.toFixed(5));
      onChange(newLat, newLng);
    });

    mapRef.current = map;
    markerRef.current = marker;

    // Invalidate map size after initial container layout renders
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []); // Run once on mount

  // Sync map center & marker when props change externally (presets or GPS)
  useEffect(() => {
    if (mapRef.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      const dist = Math.abs(currentPos.lat - lat) + Math.abs(currentPos.lng - lng);
      if (dist > 0.0001) {
        markerRef.current.setLatLng([lat, lng]);
        mapRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
      }
    }
  }, [lat, lng]);

  return (
    <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700 border border-slate-200/80 shadow-2xs pointer-events-none">
        📍 Click map or drag pin to adjust coordinates
      </div>
    </div>
  );
}
