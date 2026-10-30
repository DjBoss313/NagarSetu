NagarSetu: From Complaints to Action

New app at [C:\Users\Abin\NagarSetu](C:\Users\Abin\NagarSetu). First actions after you approve: create the folder, git init, then move_agent_to_root before scaffolding.

Product in one sentence

Citizens file a civic issue in under a minute; the app categorizes, summarizes, links duplicates, scores priority with visible reasons, shows hotspots, and lets an officer move the report through a status timeline the citizen can track.

Architecture

flowchart LR
  citizen[Citizen form]
  api[Next.js API routes]
  db[(SQLite)]
  ai[AI pipeline]
  officer[Officer dashboard]
  track[Tracking page]
  citizen --> api --> db
  api --> ai
  ai --> db
  officer --> api
  track --> api

Stack (fixed): Next.js App Router + TypeScript + Tailwind; better-sqlite3; Leaflet + react-leaflet + OSM; Node standalone output for Cloud Run.

No login. A persistent Citizen | Officer toggle (cookie or localStorage) switches the nav and default landing page.

Data model

SQLite in a writable folder (data/nagarsetu.db; uploads in data/uploads).





reports: id, tracking_code, description, image_path, category (user + AI), lat, lng, address, priority_score (0–100), priority_label, priority_factors_json, summary, summary_source (llm | fallback), duplicate_of, cluster_id, status, assignee, created_at, updated_at



status_history: report_id, from_status, to_status, note, actor, created_at



clusters: id, centroid_lat/lng, radius_m, report_count, top_categories, brief, brief_source

Seed on empty DB: 40–50 synthetic reports around one Indian city (e.g. Kochi/Bengaluru bbox), including:





intentional near-duplicates (~150 m, similar text/category)



urgent safety items (exposed wire, open manhole)



at least one mixed-category street cluster (≥3 reports within ~300 m)



a small mocked nearby-sensitive-places list (schools, hospitals, bus stands) stored as JSON, labelled “mocked”

Statuses (enforced in code): Submitted → Under Review → Assigned → In Progress → Resolved. Rejected and Merged are allowed from early states (Submitted, Under Review) only. Invalid transitions return 400.

Tracking codes: NS- plus 6 random alphanumeric characters (not sequential). Retry on collision.

AI pipeline (must work with no API key)

Run synchronously in the submit request, in lib/ai/, before the HTTP response. Order: categorize → summarize → duplicates → priority → re-cluster. Do not defer to a background job. Wrap Gemini in try/catch plus a ~5 second timeout; on timeout, missing key, or error, use the rule-based fallback automatically so the request still succeeds.

LLM provider: Gemini only, via GEMINI_API_KEY. Never OpenAI.





Categorize: keyword/rules first; optional Gemini confirm (5s timeout). Always store a category.



Summarize: Gemini 1–2 sentences if GEMINI_API_KEY is set and the call succeeds in time; else template fallback. UI label: “AI summary” vs “Fallback summary (no LLM key)”.



Duplicates: TF-IDF plus token overlap only (no embeddings) AND distance < ~150 m AND related category. Show matched report, similarity, distance. Link (duplicate_of); officer can confirm merge or reject the link. Never delete.



Priority (rule-based only, not LLM): sum of explained factors, clamp 0–100, label Critical / High / Medium / Low. Example factors:





severity keywords (+25 exposed wire)



category base risk



duplicate/related count nearby



mocked sensitive place within ~200 m



age (older open reports gain points)



UI lists each factor in plain language



Hotspots: greedy/distance clustering, ~300 m, min 3 reports, mixed categories allowed. Persist in clusters.



Action brief: Gemini if available within 5s; else template: counts, top issue, critical items, suggested first fix. Label source.

No embeddings. Duplicate/similarity work is TF-IDF + token overlap so Cloud Run needs no extra model files.

Screens (demo path only)







Route



Role



Purpose





/



Citizen



Mobile-first form: text and/or photo, category, map pin/coords; submit < 1 min





/report/[trackingCode]



Citizen



AI result + later status timeline





/track



Citizen



Enter tracking code





/officer



Officer



Cards, ranked list, filters, tiny charts





/officer/map



Officer



Pins by priority color; hotspot polygons/circles





/officer/reports/[id]



Officer



Assign, status, notes, confirm/reject duplicate, action brief





/officer/hotspots



Officer



Cluster list + generated brief

Mocked, labelled: SMS/email notification log (“would be sent”); sensitive-places list. No real SMS/email.

Cloud Run





[Dockerfile](C:\Users\Abin\NagarSetu\Dockerfile): Node image that can compile better-sqlite3; output: 'standalone'; PORT=8080; writable /app/data



max-instances=1 so all visitors share one SQLite file



Auto-seed if DB empty



Secrets only via env; never commit keys



README: gcloud run deploy with --max-instances 1, memory ~1Gi, CPU 1



Test deploy ~hour 3–4, final redeploy hour 7–8



Honesty: data is ephemeral unless a volume is attached (default: ephemeral)

Hour-by-hour (8 hours)

0–1 — Scope and data





Scaffold Next.js, Tailwind, SQLite helper, seed JSON, types, status enum



Dockerfile skeleton + .env.example

1–3.5 — Capture + AI





Citizen form (mobile), file upload, tracking code



Pipeline (sync, before response): category, summary, duplicates, priority, re-cluster; Gemini 5s timeout + fallback



Post-submit AI result page



Test deploy once the form+DB work (even if map is empty)

3.5–5.5 — Reveal + Act





Officer list/cards/charts, Leaflet map, hotspot clustering



Detail: assign, status transitions, history



Action brief

5.5–7 — Tracking + explanations





Citizen timeline, role switch, factor copy, duplicate confirm/reject, edge cases (no photo, no LLM key, merge)

7–8 — Ship





README (setup, architecture, AI, deploy), LIMITATIONS.md



Final Cloud Run redeploy, demo rehearsal, optional screen recording backup

Skip: auth, real GIS APIs, SMS, multi-officer accounts, ML training, admin settings.

Judge-explainable talking points





Priority is a transparent score, not a black-box LLM rank.



Duplicates need text + distance + category, then a human confirm.



Hotspots are simple distance groups, honest about that.



LLM is an optional Gemini layer (GEMINI_API_KEY, 5s timeout) with labelled fallbacks.



Duplicates use TF-IDF + token overlap, not embeddings.



Tracking codes are NS- + 6 random alphanumeric characters.



Status changes follow a strict transition graph.

Deliverables





Working prototype (local + Cloud Run URL)



README + Limitations and Honesty note



Demo script (~5 min): submit → AI reasons → hotspot/brief → assign/status → citizen sees update



Backup: record that same path if live deploy flakes

Also locked in





Photos are stored and shown but not analyzed (note in LIMITATIONS.md).



Seed: mocked school/hospital within 200 m of the main cluster; created_at spread over several days; realistic street names for one Indian city.



Script that verifies seed: intentional duplicates detected and cluster found (TF-IDF + token overlap).



Leaflet: dynamic import ssr: false, fix default marker icons, circles for hotspots.



Dockerfile: serverExternalPackages: ['better-sqlite3']; copy .next/static and public into the standalone image.



LIMITATIONS.md: no auth, ephemeral Cloud Run data, photo not analyzed, TF-IDF misses synonyms, hotspots are simple distance groups, mocked sensitive-places list and notification log.

Build process: one to-do at a time; stop after each so it can be tested. First: bootstrap (folder, git, workspace move, Next.js + SQLite helper + Dockerfile skeleton).