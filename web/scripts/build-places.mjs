#!/usr/bin/env node
/**
 * build-places.mjs — turns the US Census Gazetteer "Places" file into the small
 * bucketed lookup the storefront map uses to name real towns around a mechanic.
 *
 * WHY THIS EXISTS. The service-area drawing used to place town names in four
 * hardcoded corners at a fixed ring size, so it said the same thing for every
 * mechanic in the country. To draw the truth we need real coordinates for real
 * places, and we need them WITHOUT a per-render API call, an API key, or a
 * runtime dependency on anyone else's uptime.
 *
 * SOURCE. US Census Bureau Gazetteer Files, Places (national). US federal
 * government work, public domain, so there is no attribution string to carry and
 * nothing to renew.
 *   https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2023_Gazetteer/2023_Gaz_place_national.zip
 *
 * HOW TO REGENERATE (rarely; the file is committed):
 *   1. download and unzip the archive above
 *   2. node web/scripts/build-places.mjs path/to/2023_Gaz_place_national.txt
 *   3. commit the regenerated web/lib/places.data.json
 *
 * OUTPUT SHAPE. Buckets keyed by whole-degree cell so a lookup only scans the
 * nine cells around a point instead of 30k rows:
 *   { "42,-114": [ ["Twin Falls","ID",42.5558,-114.4699,1], ... ] }
 * The last field is a rank tier: 0 = incorporated place (city/town/village),
 * 1 = everything else (mostly CDPs, which are statistical areas rather than
 * municipalities). It is used only to break ties toward real municipalities when
 * two places are a similar distance away.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) {
  console.error('usage: node build-places.mjs <2023_Gaz_place_national.txt>');
  process.exit(1);
}

// LSAD codes for genuinely incorporated municipalities. Everything else (chiefly
// 57 = CDP) is a statistical area, useful but ranked below a real town.
const INCORPORATED = new Set(['21', '25', '43', '47', '53', '62']);

// Suffixes the Census appends to NAME. Stripped so the map prints "Naperville",
// not "Naperville city".
const SUFFIX = /\s+(CDP|city|town|village|borough|municipality|comunidad|zona urbana)$/i;

const lines = readFileSync(src, 'utf8').split('\n');
const header = lines[0].split('\t').map((h) => h.trim());
const col = (name) => header.indexOf(name);
const iUSPS = col('USPS');
const iNAME = col('NAME');
const iLSAD = col('LSAD');
const iALAND = col('ALAND_SQMI');
const iLAT = col('INTPTLAT');
const iLNG = col('INTPTLONG');

if ([iUSPS, iNAME, iLSAD, iALAND, iLAT, iLNG].some((i) => i < 0)) {
  console.error('unexpected header:', header.join('|'));
  process.exit(1);
}

const buckets = {};
let kept = 0;
let skipped = 0;

for (let n = 1; n < lines.length; n++) {
  const raw = lines[n];
  if (!raw.trim()) continue;
  const f = raw.split('\t');
  if (f.length <= iLNG) { skipped++; continue; }

  const lat = parseFloat(f[iLAT]);
  const lng = parseFloat(f[iLNG]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) { skipped++; continue; }

  // Drop the smallest specks. A 0.3 sq mi hamlet is noise on a 25-mile radar and
  // there are thousands of them; this is the one filter that keeps the file small
  // without needing a second download for population.
  const land = parseFloat(f[iALAND]);
  if (!Number.isFinite(land) || land < 0.5) { skipped++; continue; }

  const state = f[iUSPS].trim();
  const name = f[iNAME].trim().replace(SUFFIX, '').trim();
  if (!name || !state) { skipped++; continue; }

  const tier = INCORPORATED.has(f[iLSAD].trim()) ? 0 : 1;
  const key = `${Math.floor(lat)},${Math.floor(lng)}`;
  (buckets[key] ||= []).push([name, state, Math.round(lat * 1e4) / 1e4, Math.round(lng * 1e4) / 1e4, tier]);
  kept++;
}

const out = 'C:\\Users\\kroha\\trymyku.com\\web\\lib\\places.data.json';
writeFileSync(out, JSON.stringify(buckets));
const bytes = JSON.stringify(buckets).length;
console.log(`kept ${kept}, skipped ${skipped}, ${Object.keys(buckets).length} buckets, ${(bytes / 1024).toFixed(0)} KB`);
console.log(`wrote ${out}`);
