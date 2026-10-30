# Limitations and Honesty

> A transparent assessment of what is production-ready, what is simulated for the hackathon prototype, known failure modes, and the future engineering roadmap.

---

## 1. What is Real

- **Relational Data Storage**: Real SQLite database (`data/nagarsetu.db`) using WAL (Write-Ahead Logging) mode, foreign key constraints, indexed lookups, and atomic transactions via `better-sqlite3`.
- **Photo Storage Pipeline**: Citizen photos are saved to local filesystem storage (`data/uploads/`) with path-traversal protection and served via `/api/uploads/[filename]`.
- **Interactive GIS Mapping**: Real Leaflet map using OpenStreetMap vector tiles, dynamic marker dragging, coordinate reverse-binding, priority-colored SVG pins, and hotspot boundary circles.
- **Duplicate Detection Engine**: Real TF-IDF token overlap and cosine vector similarity combined with geographic Haversine distance calculations (< 150m) and departmental category correlation.
- **Explainable Priority Scoring**: Transparent 0–100 formula that calculates and persists the exact itemized factor reasons for every point awarded.
- **Workflow State Machine**: Strict status transitions (`Submitted` → `Under Review` → `Assigned` → `In Progress` → `Resolved`) with programmatic enforcement returning HTTP 400 for illegal jumps.
- **Google Gemini Integration**: Real Google Gemini REST API client with a strict 5-second deadline (`AbortSignal.timeout(5000)`), automated error handling, and structured deterministic fallbacks.
- **Autonomous Seeding**: Real dataset of 45 synthetic civic complaints situated in Bengaluru with intentional near-duplicates and safety hazards.

---

## 2. What is Mocked

- **Sensitive Facilities Dataset (`data/sensitive_places.json`)**:
  - Contains 8 representative schools, hospitals, and transit hubs across Bengaluru (e.g. *St. Joseph's Boys' High School*, *Bowring Hospital*, *Indiranagar Metro Station*).
  - Explicitly labeled with `"is_mocked": true`.
  - In a production municipal system, this would query a real GIS spatial database or government master facilities register.
- **Citizen SMS / Email Notification Dispatch Log**:
  - The notification stream on `/officer/reports/[id]` is simulated and explicitly badged as **`Mocked: SMS/email would be sent`**.
  - No actual external telecom SMS gateways (Twilio, Gupshup) or transactional email APIs (SendGrid, Postmark) are connected.

---

## 3. Where the AI Can Be Wrong

- **Lexical Keyword Categorization**:
  - Rule-based keyword matching relies on department vocabulary dictionaries.
  - Ambiguous citizen reports (e.g., *"transformer leaking dirty water into gutter"*) may misclassify between Electricity and Water & Sewage.
- **TF-IDF Near-Duplicate Scanning**:
  - Lexical token overlap works well for direct phrasing but cannot detect deep semantic synonyms if words do not overlap (e.g. *"deep trench in asphalt"* vs *"pothole crater"*).
  - Suspected duplicates are **linked, never auto-deleted**, requiring human officer confirmation to prevent false-positive data loss.
- **Spatial Hotspot Radii**:
  - Greedy distance clustering uses spherical Euclidean / Haversine distance (~300m radius).
  - It does not account for physical barriers such as railway lines, rivers, or arterial highways that divide physical neighborhoods.
- **LLM Phrasing Variance**:
  - When Gemini is active, summaries and action briefs are generated via prompt instructions. While temperature is clamped to `0.2`, minor phrasing differences can occur between runs.

---

## 4. Architectural Limitations (per PLAN.md)

- **No Authentication**:
  - The persistent **Citizen | Officer** toggle in the navbar is a demo convenience.
  - There is no user authentication, session token, or login barrier. Anyone with access can toggle roles.
- **Ephemeral Storage on Cloud Run**:
  - Google Cloud Run instances use an in-memory, ephemeral filesystem.
  - Unless backed by a mounted Google Cloud Storage (GCS) FUSE bucket, the SQLite database and uploaded photos reset when the Cloud Run container instance restarts or scales down to zero.
  - Setting `--max-instances 1` ensures all visitors during the demo share a single consistent SQLite instance.
- **Photos Stored But Not Analyzed**:
  - Citizen photos are captured, stored, and displayed for officer inspection, but are **not analyzed by computer vision models**.
  - The AI pipeline does not measure pothole depth or verify debris clearance from photos.
- **Single Officer Role**:
  - All officer actions (status transitions, notes, assignments) are recorded under a generic `"Officer"` persona rather than authenticated individual employee IDs.

---

## 5. Next Steps & Production Roadmap

1. **PostGIS & Municipal GIS Integration**:
   - Migrate from local SQLite to PostgreSQL with **PostGIS** for real spatial queries and ward boundary polygon intersections.
2. **Computer Vision Verification**:
   - Integrate multimodal Gemini Vision to verify pothole severity from photos and validate "after" photos uploaded by field repair teams.
3. **Official Notification Channels**:
   - Connect citizen SMS and WhatsApp messaging via GovNotify or WhatsApp Business API.
4. **Role-Based Access Control (RBAC)**:
   - Implement single sign-on (SSO) with municipal department directories (e.g. Roads, Electricity, Sanitation) with fine-grained assignment permissions.
5. **Persistent Cloud Storage**:
   - Store citizen uploaded evidence on Google Cloud Storage (GCS) and database snapshots on Cloud SQL.
