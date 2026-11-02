'use client';

import { CIVIC_CATEGORIES } from '@/lib/ai/categorize';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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

const MANGALURU_PRESETS = [
  { name: 'Hampankatta (K.S. Rao Rd)', lat: 12.8698, lng: 74.843, address: 'K.S. Rao Road, Hampankatta, Mangaluru' },
  { name: 'Kadri (Mallikatte Circle)', lat: 12.8856, lng: 74.8562, address: 'Mallikatte Circle, Kadri, Mangaluru' },
  { name: 'Lalbagh (MCC Head Office)', lat: 12.882, lng: 74.8398, address: 'MG Road, opposite MCC Head Office, Lalbagh, Mangaluru' },
  { name: 'Bejai (KSRTC Terminal)', lat: 12.8885, lng: 74.845, address: 'Bejai Main Road near KSRTC Bus Stand, Mangaluru' },
  { name: 'Kankanady (Pumpwell)', lat: 12.865, lng: 74.862, address: 'Father Muller Hospital Road, Kankanady, Mangaluru' },
  { name: 'Surathkal (NITK Beach)', lat: 13.008, lng: 74.794, address: 'Surathkal Main Highway near NITK, Mangaluru' },
];

export default function CitizenSubmitPage() {
  const router = useRouter();

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Roads & Potholes');
  const [address, setAddress] = useState('K.S. Rao Road, Hampankatta, Mangaluru');
  const [lat, setLat] = useState(12.8698);
  const [lng, setLng] = useState(74.843);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Anti-bot & honeypot defense state
  const [honeypot, setHoneypot] = useState('');
  const [antiBotToken, setAntiBotToken] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Fetch anti-bot challenge token on initial form mount
    fetch('/api/challenge')
      .then((res) => res.json())
      .then((data) => {
        if (data?.token) {
          setAntiBotToken(data.token);
        }
      })
      .catch(() => {});
  }, []);

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
          setAddress('K.S. Rao Road, Hampankatta, Mangaluru');
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
      if (honeypot) {
        formData.append('website', honeypot);
      }
      if (antiBotToken) {
        formData.append('anti_bot_token', antiBotToken);
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
    <div className="w-full flex flex-col items-center">
      {/* 1. Hero / Landing Section */}
      <section className="w-full bg-gradient-to-b from-blue-900 via-blue-800 to-indigo-900 text-white py-14 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        {/* Subtle decorative civic background accents */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(234,88,12,0.18),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.25),transparent_50%)] pointer-events-none" />

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-orange-300 text-xs font-bold border border-white/15 mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></span>
            <span>Mangaluru Municipal Civic Action Network</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight max-w-4xl leading-tight">
            From Civic Complaints <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-200 bg-clip-text text-transparent">
              to Transparent Field Action
            </span>
          </h1>

          <p className="text-base sm:text-lg text-blue-100/90 max-w-2xl mt-4 leading-relaxed font-normal">
            Empowering citizens to report potholes, water leaks, and safety hazards in under 60 seconds. Our AI triage scores urgency, merges duplicates, and dispatches directly to ward engineers.
          </p>

          {/* Big Call-To-Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-8 w-full sm:w-auto">
            <a
              href="#file-report"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-sm shadow-lg hover:shadow-orange-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Report an Issue Now</span>
              <span>↓</span>
            </a>
            <button
              type="button"
              onClick={() => router.push('/track')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 backdrop-blur-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Track Existing Report</span>
              <span>→</span>
            </button>
          </div>

          {/* Quick Demo Info Pill */}
          <div className="flex items-center gap-2 text-xs text-blue-200/80 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full mt-6 font-medium">
            <span>ℹ️</span>
            <span>Preloaded with realistic Mangaluru City Corporation (MCC) civic issues for live demo evaluation</span>
          </div>
        </div>
      </section>

      {/* 2. "How it Works" - 3 Cards CSS Grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-20 w-full mb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200/60 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
              01
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Snap & Locate
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Describe the hazard, drop a precise pin on Mangaluru streets, and attach an optional photo directly from your camera.
            </p>
            <div className="text-[11px] font-bold text-orange-600 pt-1">
              &lt; 60 seconds • Zero signup required
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
              02
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              AI Triage & Prioritization
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Smart algorithms analyze severity, detect child safety keywords, and flag nearby duplicate reports to prevent redundant work.
            </p>
            <div className="text-[11px] font-bold text-blue-600 pt-1">
              Transparent 0-100 Score • LLM Summaries
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-black text-sm group-hover:scale-110 transition-transform">
              03
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">
              Field Action & Live Audit
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Assigned directly to municipal maintenance crews with public audit history. Track every milestone from Reported to Resolved.
            </p>
            <div className="text-[11px] font-bold text-emerald-600 pt-1">
              Public Tracking Code • Simulated SMS
            </div>
          </div>
        </div>
      </section>

      {/* 3. Centered Report Submission Form */}
      <main id="file-report" className="max-w-2xl mx-auto px-4 pb-16 w-full flex flex-col gap-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
            <span>📝 Official Grievance Intake</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            File a Civic Complaint
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-lg mx-auto">
            Fill in the details below. Your report will be immediately evaluated by our AI pipeline and queued for municipal resolution.
          </p>
        </div>

        {/* Submission Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-200/90 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-5"
        >
          {/* Honeypot field (hidden from legitimate users, auto-filled by spam crawlers) */}
          <div className="hidden" aria-hidden="true" style={{ display: 'none' }}>
            <label htmlFor="website">Leave this field empty</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2 shadow-2xs">
              <span className="text-base">⚠️</span>
              <span>{errorMessage}</span>
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
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none font-medium"
            />
            <div id="desc-hint" className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
              <span>Provide key details for municipal field crew.</span>
              <span className="font-mono">{description.length} chars</span>
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
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium cursor-pointer"
            >
              {CIVIC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Photo Upload */}
          <div className="pt-2 border-t border-slate-100">
            <label htmlFor="issue-photo" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Photo Upload <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="flex items-center gap-4">
              <label htmlFor="issue-photo" className="cursor-pointer px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors shrink-0 flex items-center gap-1.5">
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
                    className="absolute inset-0 bg-black/50 text-white text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
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
                className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors cursor-pointer"
              >
                📍 Use Device GPS
              </button>
            </div>

            {/* Quick Area Presets */}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mangaluru neighborhood presets">
              {MANGALURU_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  aria-label={`Select location preset: ${p.name}`}
                  onClick={() => {
                    setAddress(p.address);
                    setLat(p.lat);
                    setLng(p.lng);
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-medium"
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
            className="w-full mt-3 py-4 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-700 hover:via-orange-600 hover:to-amber-600 active:scale-[0.99] disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md hover:shadow-lg transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Evaluating with AI Pipeline...</span>
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
    </div>
  );
}
