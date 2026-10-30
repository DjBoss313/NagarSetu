'use client';

import { CIVIC_CATEGORIES } from '@/lib/ai/categorize';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// Location presets for demo testing around Bengaluru
const BENGALURU_PRESETS = [
  { name: 'Koramangala (80 Feet Road)', lat: 12.9358, lng: 77.6251, address: '80 Feet Road, Koramangala, Bengaluru' },
  { name: 'Indiranagar (100 Feet Road)', lat: 12.9783, lng: 77.6392, address: '100 Feet Road, Indiranagar, Bengaluru' },
  { name: 'Museum Road (MG Road area)', lat: 12.9721, lng: 77.6012, address: 'Museum Road, Central Bengaluru' },
  { name: 'Malleshwaram (8th Cross)', lat: 13.0032, lng: 77.5705, address: '8th Cross, Malleshwaram, Bengaluru' },
  { name: 'Whitefield (Hope Farm)', lat: 12.9842, lng: 77.7512, address: 'Whitefield Main Road, Bengaluru' },
];

// Presets specifically crafted for judge evaluation of AI pipeline
const JUDGE_DEMO_PRESETS = [
  {
    label: '🚨 Open Manhole near School',
    desc: 'Deep open manhole without cover outside St. Joseph School gate, severe pedestrian and student fall hazard.',
    cat: 'Public Safety',
    lat: 12.9721,
    lng: 77.6012,
    address: 'Museum Road near St. Joseph School, Bengaluru',
  },
  {
    label: '⚡ Exposed Sparking Wire',
    desc: 'Exposed live electrical cable dangling from street pole near bus stop, sparking dangerously in rain.',
    cat: 'Electricity & Streetlights',
    lat: 12.9723,
    lng: 77.6014,
    address: 'Museum Road Bus Stop, Bengaluru',
  },
  {
    label: '🔄 Duplicate: Pothole near Sony World',
    desc: 'Huge deep pothole on 80 feet road near Sony World signal, tires puncturing and vehicles swerving dangerously.',
    cat: 'Roads & Potholes',
    lat: 12.9359,
    lng: 77.6252,
    address: '80 Feet Road near Sony World signal, Koramangala, Bengaluru',
  },
  {
    label: '🗑️ Duplicate: Garbage near KFC 100ft Rd',
    desc: 'Massive garbage pile overflowing on corner near KFC Indiranagar, blocking pedestrian walkway and stinking.',
    cat: 'Garbage & Sanitation',
    lat: 12.9784,
    lng: 77.6393,
    address: '100 Feet Road near KFC, Indiranagar, Bengaluru',
  },
];

export default function CitizenReportFormPage() {
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('auto');
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

  const applyDemoPreset = (preset: (typeof JUDGE_DEMO_PRESETS)[0]) => {
    setDescription(preset.desc);
    setCategory(preset.cat);
    setLat(preset.lat);
    setLng(preset.lng);
    setAddress(preset.address);
    setErrorMessage('');
  };

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(Number(pos.coords.latitude.toFixed(5)));
          setLng(Number(pos.coords.longitude.toFixed(5)));
          setAddress('Device GPS Coordinates detected');
        },
        () => {
          // Default fallback
          setAddress('Koramangala 80 Feet Road, Bengaluru');
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      setErrorMessage('Please provide a brief description of the issue (at least 5 characters).');
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
        throw new Error(data.error || 'Failed to submit report');
      }

      // Immediately redirect to AI result and tracking timeline
      router.push(`/report/${data.tracking_code}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error submitting complaint';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 w-full flex flex-col gap-6">
      {/* Title & Introduction */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
          <span>⚡ Fast Citizen Portal</span>
          <span>•</span>
          <span>Submit in &lt; 1 minute</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          File a Civic Complaint
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Report road damage, sanitation hazards, or safety hazards. Our AI engine categorizes, links duplicates, and prioritizes your report for municipal action.
        </p>
      </div>

      {/* Judge Demo Quick-Fill Presets */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/60 p-4 rounded-2xl border border-blue-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <span>🎯</span> Quick Test Presets (For Judges)
          </span>
          <span className="text-[11px] text-blue-700 font-medium">Click to populate</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {JUDGE_DEMO_PRESETS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyDemoPreset(p)}
              className="text-left text-xs bg-white hover:bg-blue-50/50 active:bg-blue-100 p-2.5 rounded-xl border border-blue-200/70 text-slate-800 font-medium transition-all shadow-2xs hover:border-blue-400"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Complaint Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col gap-5">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
            {errorMessage}
          </div>
        )}

        {/* Description Field */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Describe the Issue <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            placeholder="e.g. Deep pothole causing accidents near Sony World signal, broken streetlight..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
          />
          <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
            <span>Be as specific as possible about the hazard.</span>
            <span>{description.length} chars</span>
          </div>
        </div>

        {/* Category Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Municipal Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
          >
            <option value="auto">✨ Auto-Detect via AI / Keywords</option>
            {CIVIC_CATEGORIES.filter((c) => c !== 'Other').map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Location Section */}
        <div className="flex flex-col gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Location / Landmark
            </label>
            <button
              type="button"
              onClick={handleUseLocation}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
            >
              📍 My Location
            </button>
          </div>

          {/* Quick Area Presets */}
          <div className="flex flex-wrap gap-1.5">
            {BENGALURU_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setAddress(p.address);
                  setLat(p.lat);
                  setLng(p.lng);
                }}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  address === p.address
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.name.split(' (')[0]}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Street address or landmark name..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                Latitude
              </span>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs"
              />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block mb-1">
                Longitude
              </span>
              <input
                type="number"
                step="0.0001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-800 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Optional Photo Upload */}
        <div className="pt-1 border-t border-slate-100">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            Attach Photo <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <div className="flex items-center gap-4">
            <label className="cursor-pointer px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shrink-0">
              <span>Choose Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
            {previewUrl && (
              <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <Image
                  src={previewUrl}
                  alt="Upload preview"
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <span className="text-xs text-slate-400 truncate">
              {photo ? photo.name : 'No image chosen'}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-xs transition-all text-sm flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Processing AI Pipeline...</span>
            </>
          ) : (
            <>
              <span>Submit Report & Track</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>
    </main>
  );
}
