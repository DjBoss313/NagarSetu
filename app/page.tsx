'use client';

import { CIVIC_CATEGORIES } from '@/lib/ai/categorize';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Leaflet map dynamically imported with ssr: false per PLAN.md
const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 sm:h-72 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 gap-2 border border-slate-200 animate-pulse">
      <span className="text-xl">🗺️</span>
      <span className="text-xs font-medium">Loading interactive OpenStreetMap...</span>
    </div>
  ),
});

const BENGALURU_PRESETS = [
  { name: 'Koramangala (80 Feet Rd)', lat: 12.9358, lng: 77.6251, address: '80 Feet Road, Koramangala, Bengaluru' },
  { name: 'Indiranagar (100 Feet Rd)', lat: 12.9783, lng: 77.6392, address: '100 Feet Road, Indiranagar, Bengaluru' },
  { name: 'MG Road (Museum Road)', lat: 12.9721, lng: 77.6012, address: 'Museum Road, Central Bengaluru' },
  { name: 'Malleshwaram (8th Cross)', lat: 13.0032, lng: 77.5705, address: '8th Cross, Malleshwaram, Bengaluru' },
  { name: 'Whitefield (Hope Farm)', lat: 12.9842, lng: 77.7512, address: 'Whitefield Main Road, Bengaluru' },
];

export default function CitizenSubmitPage() {
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Potholes');
  const [address, setAddress] = useState('80 Feet Road, Koramangala, Bengaluru');
  const [lat, setLat] = useState(12.9358);
  const [lng, setLng] = useState(77.6251);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleMapCoordChange = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
  };

  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const detectedLat = Number(pos.coords.latitude.toFixed(5));
          const detectedLng = Number(pos.coords.longitude.toFixed(5));
          setLat(detectedLat);
          setLng(detectedLng);
          setAddress('Current Device GPS Location');
        },
        () => {
          setAddress('Koramangala 80 Feet Road, Bengaluru');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Please describe the issue (minimum 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('description', description.trim());
      formData.append('category', category);
      formData.append('lat', lat.toString());
      formData.append('lng', lng.toString());
      formData.append('address', address.trim());
      if (photo) {
        formData.append('photo', photo);
      }

      const res = await fetch('/api/reports', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit complaint.');
      }

      // Redirect to report placeholder page
      router.push(`/report/${data.tracking_code}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error submitting report';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 w-full flex flex-col gap-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
          <span>⚡ Fast Citizen Portal</span>
          <span>•</span>
          <span>Submit in &lt; 1 minute</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          File a Civic Issue
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Report potholes, broken streetlights, water leaks, or civic hazards in under a minute. Drop a map pin and attach an optional photo.
        </p>
        <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-100/90 px-3 py-1.5 rounded-lg border border-slate-200/80 w-fit mt-2 font-medium">
          <span>ℹ️</span>
          <span>Demo data may reset when the server restarts.</span>
        </div>
      </div>

      {/* Submission Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col gap-5"
      >
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Issue Description */}
        <div>
          <label htmlFor="issue-description" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Describe the Issue <span className="text-red-500">*</span>
          </label>
          <textarea
            id="issue-description"
            name="description"
            rows={3}
            required
            aria-required="true"
            aria-describedby="desc-hint"
            placeholder="e.g. Deep pothole damaging vehicles, uncovered manhole outside school gate, sparking electric wire..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          />
          <div id="desc-hint" className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
            <span>Provide key details for municipal field crew.</span>
            <span>{description.length} chars</span>
          </div>
        </div>

        {/* Category Dropdown */}
        <div>
          <label htmlFor="issue-category" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Category
          </label>
          <select
            id="issue-category"
            name="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          >
            {CIVIC_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Photo Upload */}
        <div className="pt-1 border-t border-slate-100">
          <label htmlFor="issue-photo" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Photo Upload <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="flex items-center gap-4">
            <label htmlFor="issue-photo" className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shrink-0">
              <span>📷 Choose Photo</span>
              <input
                id="issue-photo"
                name="photo"
                type="file"
                accept="image/*"
                aria-label="Upload photo of the civic issue"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            {previewUrl && (
              <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0 group">
                <Image
                  src={previewUrl}
                  alt="Upload preview of civic complaint"
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  aria-label="Remove attached photo"
                  onClick={handleRemovePhoto}
                  className="absolute inset-0 bg-black/50 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  Remove
                </button>
              </div>
            )}
            <span className="text-xs text-slate-500 truncate">
              {photo ? photo.name : 'No image chosen (camera or gallery)'}
            </span>
          </div>
        </div>

        {/* Location Section with Leaflet Map */}
        <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label htmlFor="issue-address" className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pin Location on Map
            </label>
            <button
              type="button"
              aria-label="Use current device GPS location"
              onClick={handleUseMyLocation}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              📍 Use Device GPS
            </button>
          </div>

          {/* Quick Area Presets */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Bengaluru neighborhood presets">
            {BENGALURU_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                aria-label={`Select location preset: ${p.name}`}
                onClick={() => {
                  setAddress(p.address);
                  setLat(p.lat);
                  setLng(p.lng);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  lat === p.lat && lng === p.lng
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.name.split(' (')[0]}
              </button>
            ))}
          </div>

          {/* Interactive Leaflet Location Map */}
          <LocationPickerMap
            lat={lat}
            lng={lng}
            onChange={handleMapCoordChange}
          />

          <input
            id="issue-address"
            name="address"
            type="text"
            aria-label="Street address or landmark"
            placeholder="Street address or landmark..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="issue-latitude" className="text-[11px] text-slate-500 font-semibold block mb-1">
                Latitude
              </label>
              <input
                id="issue-latitude"
                name="lat"
                type="number"
                step="0.0001"
                aria-label="Latitude coordinate"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs"
              />
            </div>
            <div>
              <label htmlFor="issue-longitude" className="text-[11px] text-slate-500 font-semibold block mb-1">
                Longitude
              </label>
              <input
                id="issue-longitude"
                name="lng"
                type="number"
                step="0.0001"
                aria-label="Longitude coordinate"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-xs transition-all text-sm flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Submitting Report...</span>
            </>
          ) : (
            <>
              <span>Submit Civic Complaint</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>
    </main>
  );
}
