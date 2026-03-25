#!/usr/bin/env node
/**
 * Extract data from Excel files and generate ES module data files.
 * Usage: node scripts/extract-excel.js
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_DIR = path.join(__dirname, '..', 'excel_data');
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Event definitions: maps Excel filename to event config
const EVENTS = [
  {
    id: '100m',
    file: '100m_split_database.xlsx',
    distance: 100,
    menSheet: 'Men 100m Splits',
    womenSheet: 'Women 100m Splits',
    modelSheet: 'Pacing Model',
    segments: [
      { label: '0-30m', distance: 30 },
      { label: '30-60m', distance: 30 },
      { label: '60-90m', distance: 30 },
      { label: '90-100m', distance: 10 },
    ],
    splitColumns: ['0-10m', '10-20m', '20-30m', '30-40m', '40-50m', '50-60m', '60-70m', '70-80m', '80-90m', '90-100m'],
    extraColumns: { reactionTime: 'RT', wind: 'Wind', peakVelocity: 'Peak Velocity' },
    timeUnit: 'seconds',
    timeRange: { min: 9.5, max: 14.0 },
  },
  {
    id: '200m',
    file: '200m_split_database.xlsx',
    distance: 200,
    menSheet: 'Men 200m Splits',
    womenSheet: 'Women 200m Splits',
    modelSheet: 'Pacing Model',
    segments: [
      { label: '0-50m', distance: 50 },
      { label: '50-100m', distance: 50 },
      { label: '100-150m', distance: 50 },
      { label: '150-200m', distance: 50 },
    ],
    splitColumns: ['0-50m', '50-100m', '100-150m', '150-200m'],
    extraColumns: { wind: 'Wind' },
    timeUnit: 'seconds',
    timeRange: { min: 19.0, max: 28.0 },
  },
  {
    id: '400m',
    file: '400m_split_database.xlsx',
    distance: 400,
    menSheet: 'Men 400m Splits',
    womenSheet: 'Women 400m Splits',
    modelSheet: 'Pacing Model',
    segments: [
      { label: '0-100m', distance: 100 },
      { label: '100-200m', distance: 100 },
      { label: '200-300m', distance: 100 },
      { label: '300-400m', distance: 100 },
    ],
    splitColumns: ['0-100m', '100-200m', '200-300m', '300-400m'],
    extraColumns: { lane: 'Lane' },
    timeUnit: 'seconds',
    timeRange: { min: 40, max: 95 },
  },
  {
    id: '800m',
    file: '800m_split_database.xlsx',
    distance: 800,
    menSheet: 'Men 800m Splits',
    womenSheet: 'Women 800m Splits',
    modelSheet: 'Pacing Model',
    segments: [
      { label: '0-200m', distance: 200 },
      { label: '200-400m', distance: 200 },
      { label: '400-600m', distance: 200 },
      { label: '600-800m', distance: 200 },
    ],
    splitColumns: ['0-200m', '200-400m', '400-600m', '600-800m'],
    extraColumns: {},
    timeUnit: 'seconds',
    timeRange: { min: 100, max: 180 },
  },
  {
    id: '1500m',
    file: '1500m_mile_split_database.xlsx',
    distance: 1500,
    menSheet: 'Men 1500m Splits',
    womenSheet: 'Women 1500m Splits',
    modelSheet: 'Pacing Model',
    segments: [
      { label: '0-400m', distance: 400 },
      { label: '400-800m', distance: 400 },
      { label: '800-1200m', distance: 400 },
      { label: '1200-1500m', distance: 300 },
    ],
    splitColumns: ['0-400m', '400-800m', '800-1200m', '1200-1500m'],
    extraColumns: {},
    timeUnit: 'minutes',
    timeRange: { min: 200, max: 420 },
  },
  {
    id: '2mile',
    file: '2mile_split_database.xlsx',
    distance: 3218.69,
    menSheet: 'Men 2 Mile Splits',
    womenSheet: 'Women 2 Mile Splits',
    modelSheet: 'Pacing Model',
    segments: [
      { label: 'Lap 1', distance: 402.34 },
      { label: 'Lap 2', distance: 402.34 },
      { label: 'Lap 3', distance: 402.34 },
      { label: 'Lap 4', distance: 402.34 },
      { label: 'Lap 5', distance: 402.34 },
      { label: 'Lap 6', distance: 402.34 },
      { label: 'Lap 7', distance: 402.34 },
      { label: 'Lap 8', distance: 402.34 },
    ],
    splitColumns: ['Lap 1', 'Lap 2', 'Lap 3', 'Lap 4', 'Lap 5', 'Lap 6', 'Lap 7', 'Lap 8'],
    extraColumns: {},
    timeUnit: 'minutes',
    timeRange: { min: 460, max: 900 },
  },
  {
    id: '5k',
    file: '5K_split_database.xlsx',
    distance: 5000,
    menSheet: 'Men 5K Track Splits',
    womenSheet: 'Women 5K Track Splits',
    modelSheet: 'Pacing Model',
    segments: [
      { label: '0-1K', distance: 1000 },
      { label: '1-2K', distance: 1000 },
      { label: '2-3K', distance: 1000 },
      { label: '3-4K', distance: 1000 },
      { label: '4-5K', distance: 1000 },
    ],
    splitColumns: ['0-1K', '1-2K', '2-3K', '3-4K', '4-5K'],
    extraColumns: {},
    timeUnit: 'minutes',
    timeRange: { min: 720, max: 1800 },
  },
];

function findColumn(headers, possibleNames) {
  for (const name of possibleNames) {
    const idx = headers.findIndex(h =>
      h && h.toString().toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (idx !== -1) return idx;
  }
  // Try partial match
  for (const name of possibleNames) {
    const idx = headers.findIndex(h =>
      h && h.toString().toLowerCase().includes(name.toLowerCase())
    );
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseNumeric(val) {
  if (val === null || val === undefined || val === '' || val === '—' || val === '-') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function extractRaceData(sheet, eventConfig) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 2) return [];

  const headers = data[0].map(h => (h || '').toString().trim());

  // Find common columns
  const athleteCol = findColumn(headers, ['Athlete', 'Name']);
  const natCol = findColumn(headers, ['Nationality', 'Nat', 'Nation', 'Country']);
  const dateCol = findColumn(headers, ['Date']);
  const compCol = findColumn(headers, ['Competition', 'Comp', 'Meet']);
  const roundCol = findColumn(headers, ['Round', 'Rnd']);
  const timeCol = findColumn(headers, ['Official Time', 'Time', 'Result', 'Final Time']);
  const recordCol = findColumn(headers, ['Record Type', 'Record', 'Rec']);
  const sourceCol = findColumn(headers, ['Source', 'Src']);
  const placeCol = findColumn(headers, ['Place', 'Pl']);

  // Find split columns
  const splitCols = eventConfig.splitColumns.map(name => {
    const idx = findColumn(headers, [name]);
    return idx;
  });

  // Find extra columns
  const extraCols = {};
  for (const [key, name] of Object.entries(eventConfig.extraColumns)) {
    const idx = findColumn(headers, [name]);
    if (idx !== -1) extraCols[key] = idx;
  }

  // Find differential column
  const diffCol = findColumn(headers, ['Differential', 'Diff']);

  const entries = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[athleteCol]) continue;

    const time = parseNumeric(row[timeCol]);
    if (!time) continue;

    let splits = splitCols.map(col => col !== -1 ? parseNumeric(row[col]) : null);

    if (eventConfig.id === '100m' && splits.length === 10 && splits.every(s => s !== null)) {
      splits = [
        splits[0] + splits[1] + splits[2],
        splits[3] + splits[4] + splits[5],
        splits[6] + splits[7] + splits[8],
        splits[9],
      ];
    }

    // Skip entries where all splits are null
    const hasAnySplit = splits.some(s => s !== null);

    const extra = {};
    for (const [key, col] of Object.entries(extraCols)) {
      extra[key] = parseNumeric(row[col]);
    }
    if (diffCol !== -1) extra.diff = parseNumeric(row[diffCol]);

    let dateVal = row[dateCol];
    if (dateVal instanceof Date) {
      dateVal = dateVal.toISOString().split('T')[0];
    } else if (typeof dateVal === 'number') {
      // Excel date serial
      const d = XLSX.SSF.parse_date_code(dateVal);
      if (d) dateVal = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    }

    entries.push({
      athlete: (row[athleteCol] || '').toString().trim(),
      nat: (row[natCol] || '').toString().trim(),
      date: (dateVal || '').toString().trim(),
      comp: (row[compCol] || '').toString().trim(),
      round: roundCol !== -1 ? (row[roundCol] || '').toString().trim() : '',
      time,
      splits: hasAnySplit ? splits : [],
      record: recordCol !== -1 ? (row[recordCol] || '').toString().trim() : '',
      place: placeCol !== -1 ? parseNumeric(row[placeCol]) : null,
      src: sourceCol !== -1 ? (row[sourceCol] || '').toString().trim() : '',
      extra,
    });
  }

  return entries;
}

function extractPacingModel(sheet) {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  if (data.length < 2) return { male: [], female: [] };

  const headers = data[0].map(h => (h || '').toString().trim());

  const levelCol = findColumn(headers, ['Performance Level', 'Level', 'Tier']);
  const genderCol = findColumn(headers, ['Gender', 'Sex']);
  const targetCol = findColumn(headers, ['Target Time', 'Target']);
  const rangeCol = findColumn(headers, ['Time Range', 'Range']);

  // Find percentage columns - look for columns containing '%' or 'pct' or 'Pct'
  const pctCols = [];
  headers.forEach((h, idx) => {
    if (h && (h.toLowerCase().includes('pct') || h.toLowerCase().includes('%') ||
        h.toLowerCase().includes('percent'))) {
      pctCols.push(idx);
    }
  });

  // If no explicit pct columns, look for split-named columns after target
  if (pctCols.length === 0) {
    headers.forEach((h, idx) => {
      if (idx > (targetCol || 0) && h && !['Target Split', 'Deceleration'].some(s => h.includes(s))) {
        const val = data[1] && parseNumeric(data[1][idx]);
        if (val && val > 10 && val < 50) { // Likely a percentage
          pctCols.push(idx);
        }
      }
    });
  }

  const maleModels = [];
  const femaleModels = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[levelCol]) continue;

    const level = row[levelCol].toString().trim();
    const gender = genderCol !== -1 ? (row[genderCol] || '').toString().trim().toLowerCase() : '';
    const targetTime = parseNumeric(row[targetCol]);
    const range = rangeCol !== -1 ? (row[rangeCol] || '').toString().trim() : '';

    if (!targetTime) continue;

    const pcts = pctCols.map(col => parseNumeric(row[col])).filter(p => p !== null);
    if (pcts.length === 0) continue;

    const model = { level, range, targetTime, pcts };

    if (gender.includes('f') || gender.includes('w')) {
      femaleModels.push(model);
    } else if (gender.includes('m')) {
      maleModels.push(model);
    } else {
      // If no gender column, try to assign based on target time ranges
      // This is a heuristic; adjust per event
      maleModels.push(model);
    }
  }

  return { male: maleModels, female: femaleModels };
}

function generateDataFile(eventConfig, menData, womenData, pacingModels) {
  const lines = [];
  lines.push(`// ${eventConfig.id} Split Times Database`);
  lines.push(`// Auto-generated from ${eventConfig.file}`);
  lines.push('');
  lines.push(`export const eventMeta = ${JSON.stringify({
    id: eventConfig.id,
    name: eventConfig.id.toUpperCase() === '5K' ? '5K' : eventConfig.id,
    distance: eventConfig.distance,
    segments: eventConfig.segments,
    timeUnit: eventConfig.timeUnit,
    timeRange: eventConfig.timeRange,
  }, null, 2)};`);
  lines.push('');
  lines.push(`export const menData = ${JSON.stringify(menData, null, 2)};`);
  lines.push('');
  lines.push(`export const womenData = ${JSON.stringify(womenData, null, 2)};`);
  lines.push('');
  lines.push(`export const pacingModels = ${JSON.stringify(pacingModels, null, 2)};`);
  lines.push('');
  return lines.join('\n');
}

// Main extraction
console.log('Extracting Excel data...\n');

for (const eventConfig of EVENTS) {
  const filePath = path.join(EXCEL_DIR, eventConfig.file);

  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP: ${eventConfig.file} not found`);
    continue;
  }

  console.log(`  Processing ${eventConfig.file}...`);

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    console.log(`    Sheets: ${sheetNames.join(', ')}`);

    // Extract race data
    let menData = [];
    let womenData = [];
    let pacingModels = { male: [], female: [] };

    // Try to find men's sheet
    const menSheetName = sheetNames.find(s =>
      s.toLowerCase().includes('men') && !s.toLowerCase().includes('women')
    ) || eventConfig.menSheet;

    if (workbook.Sheets[menSheetName]) {
      menData = extractRaceData(workbook.Sheets[menSheetName], eventConfig);
      console.log(`    Men's data: ${menData.length} entries`);
    }

    // Try to find women's sheet
    const womenSheetName = sheetNames.find(s =>
      s.toLowerCase().includes('women')
    ) || eventConfig.womenSheet;

    if (workbook.Sheets[womenSheetName]) {
      womenData = extractRaceData(workbook.Sheets[womenSheetName], eventConfig);
      console.log(`    Women's data: ${womenData.length} entries`);
    }

    // Try to find pacing model sheet
    const modelSheetName = sheetNames.find(s =>
      s.toLowerCase().includes('pacing') || s.toLowerCase().includes('model')
    ) || eventConfig.modelSheet;

    if (workbook.Sheets[modelSheetName]) {
      pacingModels = extractPacingModel(workbook.Sheets[modelSheetName]);
      console.log(`    Pacing models: ${pacingModels.male.length}M / ${pacingModels.female.length}F tiers`);
    }

    // Write output
    const outputPath = path.join(DATA_DIR, `${eventConfig.id}.js`);
    const content = generateDataFile(eventConfig, menData, womenData, pacingModels);
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`    -> ${outputPath}`);
  } catch (err) {
    console.error(`    ERROR: ${err.message}`);
  }
}

console.log('\nDone!');
