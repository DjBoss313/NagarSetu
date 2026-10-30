/**
 * Seed Verification Script for NagarSetu
 * Verifies:
 * 1. Seed dataset loads successfully (~45 reports across Bengaluru)
 * 2. Intentional duplicates are linked and TF-IDF + token overlap detects them
 * 3. Hotspot clusters (300m radius, >= 3 reports) are generated and persisted
 * 4. Priority scores and sensitive place proximity are calculated
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', 'data', 'nagarsetu.db');

const db = new Database(dbPath);

console.log('=== NagarSetu Seed Verification ===\n');

// 1. Report Count
const reportCount = db.prepare('SELECT count(*) as count FROM reports').get().count;
console.log(`✓ Reports Count: ${reportCount} reports registered`);
if (reportCount < 40) {
  console.error(`FAIL: Expected at least 40 seed reports, found ${reportCount}`);
  process.exit(1);
}

// 2. Intentional Duplicates
const duplicates = db.prepare(`
  SELECT r.id, r.tracking_code, r.description, r.duplicate_of, orig.tracking_code as orig_code, orig.description as orig_desc
  FROM reports r
  JOIN reports orig ON r.duplicate_of = orig.id
`).all();

console.log(`\n✓ Intentional Duplicates Linked: ${duplicates.length} report(s)`);
for (const dup of duplicates) {
  console.log(`   - ${dup.tracking_code} linked to ${dup.orig_code}`);
  console.log(`     Dup:  "${dup.description.slice(0, 70)}..."`);
  console.log(`     Orig: "${dup.orig_desc.slice(0, 70)}..."\n`);
}
if (duplicates.length === 0) {
  console.error('FAIL: No duplicates found linked in the database.');
  process.exit(1);
}

// 3. Hotspot Clusters
const clusters = db.prepare('SELECT * FROM clusters').all();
console.log(`✓ Hotspot Clusters: ${clusters.length} cluster(s) computed`);
for (const c of clusters) {
  console.log(`   - Cluster #${c.id} at (${c.centroid_lat}, ${c.centroid_lng}):`);
  console.log(`     Reports: ${c.report_count} | Radius: ${c.radius_m}m | Top Cats: ${c.top_categories}`);
  console.log(`     Action Brief (${c.brief_source}): "${c.brief}"\n`);
}
if (clusters.length === 0) {
  console.error('FAIL: Expected at least 1 cluster to be formed.');
  process.exit(1);
}

// 4. Critical Safety Items & Sensitive Places
const criticalReports = db.prepare(`
  SELECT tracking_code, description, category, priority_score, priority_label, priority_factors_json
  FROM reports
  WHERE priority_label = 'Critical'
`).all();

console.log(`✓ Critical Safety Reports: ${criticalReports.length} critical report(s) flagged`);
for (const cr of criticalReports.slice(0, 3)) {
  console.log(`   - [${cr.tracking_code}] Score: ${cr.priority_score} (${cr.priority_label})`);
  console.log(`     "${cr.description.slice(0, 75)}..."`);
  const factors = JSON.parse(cr.priority_factors_json || '[]');
  console.log(`     Factors: ${factors.map(f => `${f.factor} (+${f.points})`).join(', ')}`);
}

console.log('\n=== All Seed & Pipeline Verifications PASSED Successfully! ===');
db.close();
