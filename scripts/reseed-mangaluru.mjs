import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const dbPath = path.join(rootDir, 'data', 'nagarsetu.db');
const seedReportsPath = path.join(rootDir, 'data', 'seed_reports.json');
const sensitivePlacesPath = path.join(rootDir, 'data', 'sensitive_places.json');

const db = new Database(dbPath);
const items = JSON.parse(fs.readFileSync(seedReportsPath, 'utf-8'));
const sensitivePlaces = JSON.parse(fs.readFileSync(sensitivePlacesPath, 'utf-8'));

function calculateHaversineDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const CATEGORY_BASE_SCORES = {
  'Electricity & Streetlights': 20,
  'Public Safety': 25,
  'Water & Sewage': 15,
  'Roads & Potholes': 15,
  'Garbage & Sanitation': 10,
  'Encroachment & Traffic': 10,
  'Other': 5,
};

const SEVERITY_PATTERNS = [
  { regex: /\b(manhole|open drain|pit)\b/i, points: 30, reason: 'Critical Fall Hazard' },
  { regex: /\b(live wire|spark|electric shock|exposed wire)\b/i, points: 35, reason: 'Electrocution Risk' },
  { regex: /\b(deep pothole|crater|cave-in)\b/i, points: 20, reason: 'Severe Road Hazard' },
  { regex: /\b(flood|waterlogging|overflowing sewage|contamination)\b/i, points: 25, reason: 'Sanitation Contamination Hazard' },
  { regex: /\b(blocked ambulance|hospital gate|fire hazard)\b/i, points: 35, reason: 'Emergency Route Obstruction' },
  { regex: /\b(falling tree|branch|collapse)\b/i, points: 25, reason: 'Structural Collapse Risk' },
  { regex: /\b(dark|blackout|flickering)\b/i, points: 15, reason: 'Nighttime Transit Risk' },
  { regex: /\b(stink|garbage dump|waste)\b/i, points: 10, reason: 'Health & Odor Disruption' },
];

function evaluatePriority(report) {
  const factors = [];
  let score = 0;

  const baseScore = CATEGORY_BASE_SCORES[report.category] ?? 10;
  score += baseScore;
  factors.push({ name: 'Base Category Risk', points: baseScore, description: `Inherent risk profile for ${report.category}` });

  for (const pat of SEVERITY_PATTERNS) {
    if (pat.regex.test(report.description)) {
      score += pat.points;
      factors.push({ name: pat.reason, points: pat.points, description: `Detected high-severity pattern in complaint text` });
      break;
    }
  }

  for (const place of sensitivePlaces) {
    const dist = calculateHaversineDistanceMeters(report.lat, report.lng, place.lat, place.lng);
    if (dist <= place.radius_m) {
      score += 20;
      factors.push({ name: 'Sensitive Facility Proximity', points: 20, description: `Within ${Math.round(dist)}m of ${place.name} (${place.type})` });
      break;
    }
  }

  const finalScore = Math.min(100, Math.max(0, score));
  let label = 'Low';
  if (finalScore >= 75) label = 'Critical';
  else if (finalScore >= 50) label = 'High';
  else if (finalScore >= 25) label = 'Medium';

  return { score: finalScore, label, factors };
}

console.log('Seeding Mangaluru reports into SQLite database...');

const insertReport = db.prepare(`
  INSERT INTO reports (
    tracking_code, description, category, user_category, ai_category,
    lat, lng, address, priority_score, priority_label, priority_factors_json,
    summary, summary_source, duplicate_of, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertHistory = db.prepare(`
  INSERT INTO status_history (report_id, from_status, to_status, note, actor, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const now = Date.now();
const insertedIdsByTracking = {};

const tx = db.transaction(() => {
  db.prepare('DELETE FROM status_history').run();
  db.prepare('DELETE FROM reports').run();
  db.prepare('DELETE FROM clusters').run();

  for (const item of items) {
    const createdAt = new Date(now - item.days_ago * 86400000).toISOString();
    const evalResult = evaluatePriority({
      description: item.description,
      category: item.category,
      lat: item.lat,
      lng: item.lng,
    });

    const summary = `Reported ${item.category.toLowerCase()} near ${item.address}: ${item.description}`;

    const res = insertReport.run(
      item.tracking_code, item.description, item.category, item.category, item.category,
      item.lat, item.lng, item.address, evalResult.score, evalResult.label,
      JSON.stringify(evalResult.factors), summary, 'fallback', null, 'Submitted',
      createdAt, createdAt
    );

    const reportId = Number(res.lastInsertRowid);
    insertedIdsByTracking[item.tracking_code] = reportId;

    insertHistory.run(reportId, 'Submitted', 'Submitted', 'Initial report registered in municipal log', 'System', createdAt);
  }

  // Link intentional duplicates in Kadri and Lalbagh
  if (insertedIdsByTracking['NS-KA0201'] && insertedIdsByTracking['NS-KA0202']) {
    db.prepare('UPDATE reports SET duplicate_of = ? WHERE id = ?').run(
      insertedIdsByTracking['NS-KA0201'],
      insertedIdsByTracking['NS-KA0202']
    );
  }

  if (insertedIdsByTracking['NS-LA0301'] && insertedIdsByTracking['NS-LA0302']) {
    db.prepare('UPDATE reports SET duplicate_of = ? WHERE id = ?').run(
      insertedIdsByTracking['NS-LA0301'],
      insertedIdsByTracking['NS-LA0302']
    );
  }
});

tx();

// Now compute spatial clusters for Mangaluru
console.log('Computing spatial clusters across Mangaluru...');
const activeReports = db.prepare('SELECT id, lat, lng, category, priority_label FROM reports').all();
const visited = new Set();
const clustersData = [];

for (const report of activeReports) {
  if (visited.has(report.id)) continue;
  const group = [report];
  visited.add(report.id);

  for (const candidate of activeReports) {
    if (visited.has(candidate.id)) continue;
    const dist = calculateHaversineDistanceMeters(report.lat, report.lng, candidate.lat, candidate.lng);
    if (dist <= 350) {
      group.push(candidate);
      visited.add(candidate.id);
    }
  }

  if (group.length >= 3) {
    const centroid_lat = Number((group.reduce((acc, r) => acc + r.lat, 0) / group.length).toFixed(6));
    const centroid_lng = Number((group.reduce((acc, r) => acc + r.lng, 0) / group.length).toFixed(6));
    let maxDist = 0;
    for (const r of group) {
      const d = calculateHaversineDistanceMeters(centroid_lat, centroid_lng, r.lat, r.lng);
      if (d > maxDist) maxDist = d;
    }
    const radius_m = Math.max(50, Math.round(maxDist));
    const counts = {};
    for (const r of group) counts[r.category] = (counts[r.category] || 0) + 1;
    const topCategories = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const criticalCount = group.filter((r) => r.priority_label === 'Critical').length;
    const brief = `High-density Mangaluru cluster of ${group.length} reports primarily affecting ${topCategories.slice(0, 2).join(' and ')}${criticalCount > 0 ? `, including ${criticalCount} urgent safety hazard(s)` : ''}. Immediate priority: dispatch MCC ward maintenance squad.`;

    clustersData.push({
      centroid_lat,
      centroid_lng,
      radius_m,
      report_count: group.length,
      top_categories: JSON.stringify(topCategories),
      brief,
      brief_source: 'fallback',
      report_ids: group.map((r) => r.id),
    });
  }
}

const insertCluster = db.prepare(`
  INSERT INTO clusters (centroid_lat, centroid_lng, radius_m, report_count, top_categories, brief, brief_source)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const updateReportCluster = db.prepare(`UPDATE reports SET cluster_id = ? WHERE id = ?`);

db.transaction(() => {
  db.prepare('DELETE FROM clusters').run();
  db.prepare('UPDATE reports SET cluster_id = NULL').run();

  for (const c of clustersData) {
    const info = insertCluster.run(c.centroid_lat, c.centroid_lng, c.radius_m, c.report_count, c.top_categories, c.brief, c.brief_source);
    const clusterId = Number(info.lastInsertRowid);
    for (const repId of c.report_ids) {
      updateReportCluster.run(clusterId, repId);
    }
  }
})();

console.log(`Successfully reseeded database with ${items.length} reports and ${clustersData.length} clusters across Mangaluru!`);
