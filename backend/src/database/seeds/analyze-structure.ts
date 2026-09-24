import * as fs from 'fs';
import * as path from 'path';

const rawData = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'ulb-raw-data.json'), 'utf8')
);

// 1. Parse Regions & Municipalities from 'Regions' sheet
const regionsSheet = rawData['Regions'];
const regionsMap: Record<string, string[]> = {};
let currentRegion = '';

for (const row of regionsSheet) {
  const vals = row.values;
  if (!vals || vals.length < 2) continue;

  // Header row
  if (vals[1] === 'S.No' || (typeof vals[1] === 'object' && vals[1]?.text === 'S.No')) continue;

  // If vals[1] is a string and matches vals[2] (e.g. ["Chengalpattu", "Chengalpattu"]) or vals[1] is not a number
  if (typeof vals[1] === 'string' && (vals[1] === vals[2] || isNaN(Number(vals[1])))) {
    currentRegion = vals[1].trim();
    if (!regionsMap[currentRegion]) {
      regionsMap[currentRegion] = [];
    }
    continue;
  }

  // Municipality row: vals[1] is S.No (number), vals[2] is ULB name (string)
  if (currentRegion && (typeof vals[1] === 'number' || !isNaN(Number(vals[1])))) {
    const muniName = typeof vals[2] === 'string' ? vals[2].trim() : vals[1]?.toString().trim();
    if (muniName) {
      regionsMap[currentRegion].push(muniName);
    }
  }
}

// 2. Parse 24 Corporations from 'CONTACT_Corporation contact nos'
const corpSheet = rawData['CONTACT_Corporation contact nos'] || [];
const corporations: Array<{ sNo: number; name: string; contact?: string; mobile?: string }> = [];

for (const row of corpSheet) {
  const vals = row.values;
  if (!vals) continue;
  // Format: [null, null, sNo, name, contactPerson, mobile, role]
  const sNo = vals[2];
  const name = vals[3];
  if (typeof sNo === 'number' && typeof name === 'string') {
    corporations.push({
      sNo,
      name: name.trim(),
      contact: vals[4],
      mobile: vals[5]?.toString(),
    });
  }
}

const summary = {
  totalRegions: Object.keys(regionsMap).length,
  regions: Object.keys(regionsMap).map((r) => ({
    name: r,
    municipalityCount: regionsMap[r].length,
    municipalities: regionsMap[r],
  })),
  totalCorporations: corporations.length,
  corporations,
};

fs.writeFileSync(
  path.resolve(__dirname, 'ulb-structured.json'),
  JSON.stringify(summary, null, 2),
  'utf8'
);

console.log(`Summary written to ulb-structured.json:`);
console.log(`- Total Regions: ${summary.totalRegions}`);
summary.regions.forEach((r) => console.log(`  * ${r.name}: ${r.municipalityCount} municipalities`));
console.log(`- Total Corporations: ${summary.totalCorporations}`);
corporations.forEach((c) => console.log(`  * [${c.sNo}] ${c.name}`));
