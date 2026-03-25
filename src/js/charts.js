/**
 * Chart factory wrapping Chart.js.
 * Creates standardized charts for pacing data.
 */
import { Chart, registerables } from 'chart.js';
import { SEGMENT_COLORS, CHART_THEME, linearRegression } from './utils.js';

Chart.register(...registerables);

// Global Chart.js defaults
Chart.defaults.color = CHART_THEME.textColor;
Chart.defaults.font.family = CHART_THEME.fontFamily;
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.scale.grid = { color: CHART_THEME.gridColor };

const chartInstances = new Map();

function destroyChart(canvasId) {
  if (chartInstances.has(canvasId)) {
    chartInstances.get(canvasId).destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Split Distribution chart — grouped bars showing each segment's % of total time across tiers.
 */
export function createSplitDistributionChart(canvasId, pacingModels, gender, segments) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const models = pacingModels[gender] || [];
  if (models.length === 0) return;

  const labels = segments.map(s => s.label);

  const datasets = models.slice(0, 6).map((model, i) => ({
    label: model.level,
    data: model.pcts.slice(0, segments.length),
    backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] + '40',
    borderColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
    borderWidth: 1.5,
  }));

  const chart = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          title: { display: true, text: '% of Total Time' },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

/** Curated 1500m races for velocity chart (date, athlete substring). */
const MEN_1500M_VELOCITY_SHOWCASE = [
  ['1998-07-14', 'Guerrouj'],
  ['2024-08-06', 'Ingebrigtsen'],
  ['2024-08-06', 'Kerr'],
  ['2024-08-06', 'Hocker'],
  ['2016-08-20', 'Centrowitz'],
];

const WOMEN_1500M_VELOCITY_SHOWCASE = [
  ['2023-06-02', 'Kipyegon'],
  ['2015-07-17', 'Dibaba'],
  ['2019-07-12', 'Hassan'],
  ['2011-08-30', 'Simpson'],
  ['2021-08-06', 'Muir'],
];

function pick1500mShowcaseRows(raceData, specs) {
  const out = [];
  for (const [date, needle] of specs) {
    const row = raceData.find(
      r =>
        r.date === date &&
        r.athlete.includes(needle) &&
        r.splits &&
        r.splits.length >= 4 &&
        r.splits.every(s => s != null)
    );
    if (row) out.push(row);
  }
  return out;
}

function fillVelocityShowcase(raceData, picked, n = 5) {
  if (picked.length >= n) return picked.slice(0, n);
  const pool = raceData.filter(
    r =>
      !picked.includes(r) &&
      r.splits &&
      r.splits.length >= 4 &&
      r.splits.every(s => s != null)
  );
  const byTime = [...pool].sort((a, b) => a.time - b.time);
  const out = [...picked];
  for (const r of byTime) {
    if (out.length >= n) break;
    out.push(r);
  }
  return out.slice(0, n);
}

/** 1500m: m/s as % of mean m/s over first three 400m segments (fair vs 300m finish). */
function splitRowTo1500RelativeSeries(splits, segments) {
  const raw = splits.slice(0, segments.length).map((s, j) => segments[j].distance / s);
  const mu = (raw[0] + raw[1] + raw[2]) / 3;
  const pct = raw.map(v => (v / mu) * 100);
  return { raw, pct };
}

function selectVelocityProfileRaces(raceData, segments, options) {
  const valid = raceData.filter(
    r => r.splits && r.splits.length >= segments.length && r.splits.every(s => s != null)
  );
  if (options.mode !== '1500_relative') {
    return valid.sort((a, b) => a.time - b.time).slice(0, 5);
  }
  const specs = options.gender === 'female' ? WOMEN_1500M_VELOCITY_SHOWCASE : MEN_1500M_VELOCITY_SHOWCASE;
  const picked = pick1500mShowcaseRows(valid, specs);
  return fillVelocityShowcase(valid, picked, 5);
}

/**
 * Velocity Profile chart — line chart of speed per segment.
 * @param {Object} [options] — { mode?: '1500_relative', gender?: 'male'|'female' }
 */
export function createVelocityProfileChart(canvasId, raceData, segments, highlightSplits = null, options = {}) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const labels = segments.map(s => s.label);
  const mode = options.mode;
  const relative1500 = mode === '1500_relative';

  const notable = selectVelocityProfileRaces(raceData, segments, options);

  const datasets = notable.map((race, i) => {
    const splits = race.splits.slice(0, segments.length);
    let data;
    let rawSpeeds;
    if (relative1500) {
      const { raw, pct } = splitRowTo1500RelativeSeries(splits, segments);
      data = pct;
      rawSpeeds = raw;
    } else {
      rawSpeeds = splits.map((s, j) => segments[j].distance / s);
      data = rawSpeeds;
    }
    return {
      label: `${race.athlete} (${race.time.toFixed(2)})`,
      data,
      rawSpeeds,
      relative1500,
      borderColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length] + '20',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 4,
      fill: false,
    };
  });

  if (highlightSplits) {
    let overlayData;
    let overlayRaw;
    if (relative1500) {
      const { raw, pct } = splitRowTo1500RelativeSeries(highlightSplits, segments);
      overlayData = pct;
      overlayRaw = raw;
    } else {
      overlayRaw = highlightSplits.map((s, i) => segments[i].distance / s);
      overlayData = overlayRaw;
    }
    datasets.push({
      label: 'Your Target',
      data: overlayData,
      rawSpeeds: overlayRaw,
      relative1500,
      borderColor: '#fff',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 3,
      borderDash: [6, 4],
      tension: 0.3,
      pointRadius: 6,
      pointStyle: 'triangle',
      fill: false,
    });
  }

  const yTitle = relative1500 ? 'Relative speed (avg of 1st 3×400m = 100%)' : 'Velocity (m/s)';

  const chart = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => {
              const ds = ctx.chart.data.datasets[ctx.datasetIndex];
              const y = ctx.parsed.y;
              if (y == null) return '';
              const raw = ds.rawSpeeds?.[ctx.dataIndex];
              if (ds.relative1500 && raw != null) {
                return `${ds.label}: ${y.toFixed(1)}% (${raw.toFixed(2)} m/s)`;
              }
              return `${ds.label}: ${y.toFixed(2)} m/s`;
            },
          },
        },
      },
      scales: {
        y: {
          title: { display: true, text: yTitle },
        },
      },
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

/**
 * Differential Analysis chart — scatter of finish time vs differential.
 */
export function createDifferentialChart(canvasId, raceData, timeUnit = 'seconds') {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const points = raceData
    .filter(r => r.time && r.extra?.diff != null)
    .map(r => ({
      x: r.time,
      y: r.extra.diff,
      label: r.athlete,
    }));

  if (points.length === 0) return;

  const reg = linearRegression(points);
  const xs = points.map(p => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const trendLine =
    reg && points.length >= 2
      ? [
          { x: xMin, y: reg.slope * xMin + reg.intercept },
          { x: xMax, y: reg.slope * xMax + reg.intercept },
        ]
      : [];

  const xTitle = timeUnit === 'minutes' ? 'Finish time' : 'Finish time (s)';

  const datasets = [
    {
      type: 'scatter',
      label: 'Performances',
      data: points,
      backgroundColor: CHART_THEME.borderColor + '80',
      borderColor: CHART_THEME.borderColor,
      borderWidth: 1,
      pointRadius: 6,
      pointHoverRadius: 9,
    },
  ];
  if (trendLine.length === 2 && reg) {
    datasets.push({
      type: 'line',
      label: `Least-squares trend (slope ${reg.slope >= 0 ? '+' : ''}${reg.slope.toFixed(3)} s/s)`,
      data: trendLine,
      borderColor: '#e879f9',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
      tension: 0,
    });
  }

  const chart = new Chart(canvas, {
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.type !== 'scatter') return '';
              const pt = points[ctx.dataIndex];
              return `${pt.label}: ${pt.x.toFixed(2)}s, diff ${pt.y.toFixed(2)}s`;
            },
          },
        },
      },
      scales: {
        x: { title: { display: true, text: xTitle } },
        y: { title: { display: true, text: 'Differential (s)' } },
      },
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

/**
 * Historical Pacing chart — how pacing has changed over decades.
 */
export function createHistoricalChart(canvasId, raceData, segments) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const validRaces = raceData
    .filter(r => r.date && r.splits && r.splits.length >= segments.length && r.splits.every(s => s != null))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (validRaces.length < 3) return;

  // Compute split percentages for each race
  const labels = validRaces.map(r => r.date.slice(0, 4));

  // Show first and last segment percentage trends
  const firstSegPcts = validRaces.map(r => (r.splits[0] / r.time) * 100);
  const lastSegPcts = validRaces.map(r => (r.splits[r.splits.length - 1] / r.time) * 100);

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `${segments[0].label} %`,
          data: firstSegPcts,
          borderColor: SEGMENT_COLORS[0],
          backgroundColor: SEGMENT_COLORS[0] + '20',
          tension: 0.3,
          pointRadius: 4,
        },
        {
          label: `${segments[segments.length - 1].label} %`,
          data: lastSegPcts,
          borderColor: SEGMENT_COLORS[3],
          backgroundColor: SEGMENT_COLORS[3] + '20',
          tension: 0.3,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: ctx => validRaces[ctx.dataIndex]?.athlete || '',
          },
        },
      },
      scales: {
        y: { title: { display: true, text: '% of Total Time' } },
      },
    },
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

/**
 * Update a velocity chart with user's target splits overlay.
 */
export function updateVelocityOverlay(canvasId, segments, userSplits, options = {}) {
  const chart = chartInstances.get(canvasId);
  if (!chart) return;

  const relative1500 = options.mode === '1500_relative';

  const existingIdx = chart.data.datasets.findIndex(d => d.label === 'Your Target');
  if (existingIdx !== -1) chart.data.datasets.splice(existingIdx, 1);

  if (userSplits) {
    let data;
    let rawSpeeds;
    if (relative1500) {
      const { raw, pct } = splitRowTo1500RelativeSeries(userSplits, segments);
      data = pct;
      rawSpeeds = raw;
    } else {
      rawSpeeds = userSplits.map((s, i) => segments[i].distance / s);
      data = rawSpeeds;
    }
    chart.data.datasets.push({
      label: 'Your Target',
      data,
      rawSpeeds,
      relative1500,
      borderColor: '#fff',
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderWidth: 3,
      borderDash: [6, 4],
      tension: 0.3,
      pointRadius: 6,
      pointStyle: 'triangle',
      fill: false,
    });
  }

  chart.update();
}

/** Draw true split seconds above each line point (Video Lab). */
const vlSplitValueLabelsPlugin = {
  id: 'vlSplitValueLabels',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx;
    chart.data.datasets.forEach((dataset, di) => {
      const meta = chart.getDatasetMeta(di);
      if (meta.hidden) return;
      meta.data.forEach((element, i) => {
        const v = dataset.data[i];
        if (v == null || Number.isNaN(v)) return;
        const { x, y } = element.getProps(['x', 'y'], true);
        ctx.save();
        ctx.fillStyle = di === 0 ? '#ffb088' : '#9aa0b8';
        ctx.font = '600 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${Number(v).toFixed(3)}s`, x, y - 10);
        ctx.restore();
      });
    });
  },
};

/**
 * Video Lab — line chart: segment duration (s) you vs pacing model at your total time.
 * (Bar chart was easy to break when the canvas was inside a `hidden` panel — zero size until layout.)
 */
export function createYouVsModelLineChart(canvasId, labels, yourSplits, modelSplits, modelDatasetLabel = 'Reference model') {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Your splits (true s)',
          data: yourSplits,
          borderColor: SEGMENT_COLORS[0],
          backgroundColor: SEGMENT_COLORS[0] + '33',
          borderWidth: 2.5,
          tension: 0.25,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: SEGMENT_COLORS[0],
          fill: false,
        },
        {
          label: modelDatasetLabel,
          data: modelSplits,
          borderColor: CHART_THEME.borderColor,
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 4],
          tension: 0.25,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: CHART_THEME.borderColor,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)}s`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Segment time (s)' },
        },
        x: {
          title: { display: true, text: 'Segment' },
        },
      },
    },
    plugins: [vlSplitValueLabelsPlugin],
  });

  chartInstances.set(canvasId, chart);
  return chart;
}

/**
 * Update reference curve on Video Lab chart (your splits stay fixed).
 */
export function updateVideoLabLineChartModel(canvasId, modelSplits, modelDatasetLabel) {
  const chart = chartInstances.get(canvasId);
  if (!chart) return;
  chart.data.datasets[1].data = modelSplits;
  chart.data.datasets[1].label = modelDatasetLabel;
  chart.update('none');
}

/** @deprecated use createYouVsModelLineChart */
export function createYouVsModelBarChart(canvasId, labels, yourSplits, modelSplits) {
  return createYouVsModelLineChart(canvasId, labels, yourSplits, modelSplits);
}
