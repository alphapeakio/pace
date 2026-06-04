/**
 * JSON / CSV / text export for Video Lab session.
 */
import { formatTime } from '../utils.js';
import { escapeHtml } from './coach-narrative.js';

function maxAbsGap(gaps) {
  if (!gaps?.length) return 0;
  return gaps.reduce((m, g) => Math.max(m, Math.abs(g.gap)), 0);
}

/**
 * Full athlete report HTML (same document as download). Returns null if no valid analysis.
 * @param {object} x — same shape as `window.__vlLastExport`
 */
export function buildAthleteReportHtmlFromExport(x) {
  if (!x || x.analysisResult?.error) return null;
  const r = x.analysisResult;
  const meta = x.eventMeta;
  const unit = meta.timeUnit || 'seconds';
  const diff =
    r.diff != null ? `${r.diff > 0 ? '+' : ''}${r.diff.toFixed(2)}s` : '—';
  const fh = r.firstHalfPct != null ? `${r.firstHalfPct.toFixed(1)}%` : '—';
  const shape = r.shape.replace(/_/g, ' ');
  const mag = maxAbsGap(r.gaps);
  const gender = x.session?.gender === 'female' ? 'female' : 'male';
  const pm = x.pacingModels;
  const tierList = pm && pm[gender];
  const canInteractive =
    pm &&
    Array.isArray(tierList) &&
    tierList.length > 0 &&
    Array.isArray(x.segmentSeconds) &&
    x.segmentSeconds.length === meta.segments?.length &&
    meta.segments?.length > 0;
  let chartSectionHtml = '';
  let chartBootHtml = '';
  if (canInteractive) {
    const payload = {
      labels: meta.segments.map(s => s.label),
      yourSplits: x.segmentSeconds.slice(),
      T: r.total,
      unit,
      gender,
      pacingModels: JSON.parse(JSON.stringify(pm)),
      segments: meta.segments.map(s => ({ label: s.label, distance: s.distance })),
    };
    const built = buildInteractiveChartParts(payload);
    chartSectionHtml = built.markup;
    chartBootHtml = built.bootHtml;
  } else if (x.chartPngDataUrl) {
    chartSectionHtml = `<div class="rp-chart"><img src="${x.chartPngDataUrl}" alt="You vs model — segment times" width="800" height="400" loading="lazy"></div>`;
  }
  const totalDisplay = formatTime(r.total, unit);
  const athleteLabel = x.session.athleteLabel || `${meta.name} pacing`;
  const ogDescription = `${meta.name} · ${x.genderLabel} · ${totalDisplay} · ${r.model.level} pacing`;

  return buildShareableReportHtml({
    title: x.session.athleteLabel || `Pacing report — ${meta.name}`,
    generatedAt: new Date().toLocaleString(),
    eventName: meta.name,
    genderLabel: x.genderLabel,
    athleteLabel,
    totalDisplay,
    modelTier: r.model.level,
    diffDisplay: diff,
    shapeDisplay: shape,
    firstHalfPctDisplay: fh,
    anchorStripHtml: buildAnchorStripHtml(meta.segments, x.segmentSeconds),
    tableInnerHtml: buildReportTableRowsHtml(r.gaps, r.total, r.total),
    chartSectionHtml,
    chartBootHtml,
    gapBarsInnerHtml: buildGapBarsInnerHtml(r.gaps, mag),
    ogTitle: athleteLabel,
    ogDescription,
  });
}

function buildAnchorStripHtml(segments, segmentSeconds) {
  if (!segments || !segmentSeconds) return '';
  let cum = 0;
  const headers =
    '<span class="rp-anchor-h">Segment</span>' +
    '<span class="rp-anchor-h rp-anchor-h--num">Split</span>' +
    '<span class="rp-anchor-h rp-anchor-h--num">Σ Total</span>';
  const rows = segments
    .map((s, i) => {
      cum += segmentSeconds[i];
      return (
        `<span class="rp-anchor-label">${escapeHtml(s.label)}</span>` +
        `<span class="rp-anchor-dur">${segmentSeconds[i].toFixed(3)}s</span>` +
        `<span class="rp-anchor-cum">${cum.toFixed(3)}</span>`
      );
    })
    .join('');
  return headers + rows;
}

/**
 * Markup only (scripts load at end of body — avoids CSP / parser issues with inline script).
 */
function buildInteractiveChartParts(payload) {
  const json = JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  const markup = `<div class="rp-section">
  <h2>Segment chart — explore reference speed</h2>
  <p class="rp-note rp-note--tight">Drag the slider: faster reference at the top, slower at the bottom. Your split times stay fixed; only the dashed reference curve moves.</p>
  <div class="rp-chart-meter-wrap">
    <aside class="rp-pace-meter" aria-label="Reference finish time — faster or slower">
      <span class="rp-pace-hot">Faster ref</span>
      <input type="range" id="rp-pace-slider" class="rp-pace-slider" min="0" max="100" value="50" step="1" orient="vertical" aria-valuetext="Reference curve target" title="Faster (top) vs slower (bottom) reference total time">
      <span class="rp-pace-cold">Slower ref</span>
    </aside>
    <div class="rp-chart-canvas-wrap">
      <canvas id="rp-chart-canvas" aria-label="Segment duration comparison"></canvas>
    </div>
  </div>
  <p id="rp-pace-readout" class="rp-pace-readout"></p>
</div>`;
  const bootHtml = `<script type="application/json" id="rp-chart-data">${json}</script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js" crossorigin="anonymous"></script>
<script src="https://pace.alphapeak.io/share-report-chart.js"></script>`;
  return { markup, bootHtml };
}

export function buildExportPayload(session, eventMeta, segmentSeconds, analysisResult) {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    eventId: session.eventId,
    eventName: eventMeta?.name,
    gender: session.gender,
    athleteLabel: session.athleteLabel || null,
    tGun: session.tGun,
    missedHeadSeconds: session.missedHeadSeconds ?? 0,
    segmentEndVideoTimes: session.segmentEndVideoTimes,
    officialTime: session.officialTime,
    reconcileMode: session.reconcileMode,
    segmentSeconds: segmentSeconds || null,
    analysis: analysisResult?.error ? { error: analysisResult.error } : stripAnalysisForJson(analysisResult),
  };
}

function stripAnalysisForJson(r) {
  if (!r || r.error) return r;
  return {
    total: r.total,
    modelLevel: r.model.level,
    diff: r.diff,
    shape: r.shape,
    firstHalfPct: r.firstHalfPct,
    projection: r.projection
      ? {
          slowSlackSeconds: r.projection.slowSlackSeconds,
          illustrativeLow: r.projection.illustrativeLow,
          illustrativeMid: r.projection.illustrativeMid,
          illustrativeHigh: r.projection.illustrativeHigh,
          blurb: r.projection.blurb,
        }
      : null,
    gaps: r.gaps.map(g => ({
      segment: g.segment,
      actual: g.actual,
      model: g.model,
      gap: g.gap,
      pctActual: g.pctActual,
      pctModel: g.pctModel,
    })),
    flags: r.flags,
  };
}

export function exportJsonBlob(payload) {
  return new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
}

export function exportCsv(eventMeta, segmentSeconds, analysisResult) {
  const rows = [['segment', 'distance_m', 'seconds', 'model_seconds', 'gap_seconds', 'pct_total']];
  if (!segmentSeconds || !eventMeta?.segments || segmentSeconds.length !== eventMeta.segments.length) {
    return new Blob(['segment,error\n"No data",\n'], { type: 'text/csv' });
  }
  const T = segmentSeconds.reduce((a, b) => a + b, 0);
  const modelSplits = analysisResult?.model?.splits;
  eventMeta.segments.forEach((seg, i) => {
    const a = segmentSeconds[i];
    const m = modelSplits?.[i];
    const gap = m != null ? a - m : '';
    rows.push([
      seg.label,
      String(seg.distance),
      a.toFixed(3),
      m != null ? Number(m).toFixed(3) : '',
      gap === '' ? '' : Number(gap).toFixed(3),
      ((a / T) * 100).toFixed(2),
    ]);
  });
  rows.push(['TOTAL', String(eventMeta.distance), T.toFixed(3), '', '', '100']);
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new Blob([csv], { type: 'text/csv' });
}

export function triggerDownload(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Single-file HTML report for athletes (open locally or attach to email).
 */
export function buildReportProjectionSectionHtml(projection) {
  if (!projection) return '';
  const low = projection.illustrativeLow.toFixed(2);
  const high = projection.illustrativeHigh.toFixed(2);
  const slack = projection.slowSlackSeconds.toFixed(2);
  const bandNote =
    projection.slowSlackSeconds < 0.005
      ? ''
      : `<p class="rp-note">Behind reference on slow segments: ~${escapeHtml(slack)} s. Possible gain if pacing aligns: ~${escapeHtml(low)}–${escapeHtml(high)} s (estimate).</p>`;
  return `<div class="rp-section">
  <h2>Pacing upside (rough)</h2>
  <p class="rp-p">${escapeHtml(projection.blurb)}</p>
  ${bandNote}
</div>`;
}

export function buildShareableReportHtml({
  title,
  generatedAt,
  eventName,
  genderLabel,
  athleteLabel,
  totalDisplay,
  modelTier,
  diffDisplay,
  shapeDisplay,
  firstHalfPctDisplay,
  anchorStripHtml = '',
  tableInnerHtml,
  chartSectionHtml = '',
  chartBootHtml = '',
  gapBarsInnerHtml,
  ogTitle = '',
  ogDescription = '',
}) {
  const head = escapeHtml(title || 'Pacing report');
  const ogT = escapeHtml(ogTitle || title || 'Pacing report');
  const ogD = escapeHtml(ogDescription || `${eventName || ''} pacing report from Pace Lab`);
  const ogImg = 'https://pace.alphapeak.io/apeak.png';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${head}</title>
<meta name="description" content="${ogD}">
<meta property="og:title" content="${ogT}">
<meta property="og:description" content="${ogD}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pace Lab · AlphaPeak">
<meta property="og:image" content="${ogImg}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="950">
<meta property="og:image:height" content="500">
<meta property="og:image:alt" content="AlphaPeak — Pace Lab">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogT}">
<meta name="twitter:description" content="${ogD}">
<meta name="twitter:image" content="${ogImg}">
<meta name="theme-color" content="#0c0c12">
<link rel="icon" type="image/png" href="${ogImg}">
<link rel="apple-touch-icon" href="${ogImg}">
<style>
:root{--bg:#0c0c12;--surface:#15151f;--border:#2a2a3a;--text:#eaeaf2;--muted:#9898a8;--text3:#666677;--accent:#ff6b35;--blue:#4d9fff;--green:#34d399;--red:#f87171;--font:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--font);background:var(--bg);color:var(--text);line-height:1.55;padding:28px 20px 48px;max-width:880px;margin:0 auto}
.rp-brand-bar{display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border);text-decoration:none;color:inherit}
.rp-brand-bar:hover{opacity:0.88}
.rp-brand-bar img{height:36px;width:auto;display:block}
.rp-brand-bar .rp-brand-text{display:flex;flex-direction:column;line-height:1.2}
.rp-brand-bar .rp-brand-name{font-size:0.78rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);font-weight:600}
.rp-brand-bar .rp-brand-tag{font-size:0.72rem;color:var(--text3);font-weight:500}
.rp-brand{font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
h1{font-size:1.65rem;font-weight:800;letter-spacing:-0.02em;margin-bottom:6px}
.rp-meta{color:var(--muted);font-size:0.88rem;margin-bottom:22px}
.rp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:24px}
.rp-card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
.rp-card .k{font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--muted);margin-bottom:4px}
.rp-card .v{font-family:var(--mono);font-size:1.05rem;font-weight:600;color:var(--accent)}
.rp-anchor-strip{display:grid;grid-template-columns:minmax(0,1fr) auto auto;column-gap:14px;row-gap:4px;align-items:center;font-size:0.84rem;line-height:1.35;color:var(--text);margin-bottom:22px;padding:12px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px}
.rp-anchor-h{font-size:0.62rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text3);font-weight:700;padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:2px}
.rp-anchor-h--num{text-align:right}
.rp-anchor-label{color:var(--muted);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rp-anchor-dur{color:var(--accent);font-weight:700;text-align:right;font-family:var(--mono)}
.rp-anchor-cum{color:var(--blue);font-weight:600;text-align:right;font-family:var(--mono)}
.rp-cum{display:inline-block;margin-top:2px;color:var(--blue);font-size:0.78rem;font-weight:500}
.rp-section{margin-top:28px}
.rp-section h2{font-size:1.05rem;font-weight:700;margin-bottom:12px}
.rp-coach{background:var(--surface);border:1px solid var(--border);border-left:4px solid var(--accent);border-radius:0 12px 12px 0;padding:18px 20px;margin-bottom:20px}
.rp-p{margin-bottom:12px;color:var(--text);font-size:0.95rem}
.rp-p:last-child{margin-bottom:0}
.rp-note{font-size:0.78rem;color:var(--muted);margin-top:14px}
.rp-note--tight{margin-bottom:10px;margin-top:0;max-width:52em}
.rp-chart{margin:16px 0;border:1px solid var(--border);border-radius:12px;overflow:hidden;background:#0a0a10}
.rp-chart img{display:block;width:100%;height:auto;max-height:420px;object-fit:contain}
.rp-chart-meter-wrap{display:flex;flex-direction:row;align-items:stretch;gap:16px;margin:14px 0 8px;max-width:100%}
.rp-pace-meter{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:8px;width:104px;flex-shrink:0;padding:12px 8px;border:1px solid var(--border);border-radius:14px;background:linear-gradient(180deg,rgba(255,107,53,0.12) 0%,var(--surface) 45%,rgba(77,159,255,0.1) 100%)}
.rp-pace-hot,.rp-pace-cold{font-size:0.72rem;font-weight:700;text-align:center;line-height:1.3;color:var(--text);max-width:92px}
.rp-pace-slider{width:28px;min-height:200px;margin:4px 0;cursor:pointer;accent-color:var(--accent);-webkit-appearance:slider-vertical;appearance:slider-vertical}
.rp-chart-canvas-wrap{flex:1;min-width:0;height:300px;position:relative;border:1px solid var(--border);border-radius:12px;background:#0a0a10;padding:8px}
#rp-chart-canvas{display:block;width:100%!important;height:100%!important;max-height:300px}
.rp-pace-readout{font-size:0.82rem;line-height:1.5;color:var(--text);text-align:center;margin-top:10px}
@media(max-width:640px){
  .rp-chart-meter-wrap{flex-direction:column;align-items:stretch}
  .rp-pace-meter{flex-direction:row;flex-wrap:wrap;justify-content:center;width:100%;min-height:0}
  .rp-pace-slider{min-height:120px;width:36px}
  .rp-chart-canvas-wrap{height:260px}
}
.rp-table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:8px;border-radius:10px}
table{width:100%;border-collapse:collapse;font-size:0.82rem;min-width:520px}
th,td{padding:10px 10px;text-align:left;border-bottom:1px solid var(--border);vertical-align:top}
th{font-size:0.66rem;text-transform:uppercase;letter-spacing:0.05em;color:var(--muted);font-weight:700}
.mono{font-family:var(--mono)}
.pct-sec{display:block;font-size:0.7rem;color:var(--muted);font-weight:400;margin-top:2px;line-height:1.3}
@media(max-width:520px){
  table{font-size:0.78rem;min-width:0}
  th,td{padding:8px 6px}
  th{font-size:0.6rem;letter-spacing:0.04em}
  .pct-sec{display:none}
}
.rp-gaps{margin-top:16px}
.rp-gap{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.rp-gap-head{display:flex;align-items:baseline;gap:10px;font-size:0.82rem;line-height:1.3;white-space:nowrap;overflow:hidden}
.rp-gap-seg{color:var(--text);font-weight:600;flex-shrink:0}
.rp-gap-true{color:var(--muted);font-size:0.74rem;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;font-family:var(--mono)}
.rp-gap-val{margin-left:auto;color:var(--text);font-weight:700;font-family:var(--mono);font-size:0.82rem;flex-shrink:0}
.rp-gap-track{position:relative;height:14px;background:#1e1e28;border-radius:7px;overflow:hidden;border:1px solid var(--border)}
.rp-gap-mid{position:absolute;left:50%;top:0;bottom:0;width:1px;background:#444;transform:translateX(-50%)}
.rp-gap-bar{position:absolute;top:2px;bottom:2px;border-radius:4px}
@media(max-width:520px){
  .rp-gap{margin-bottom:16px}
  .rp-gap-head{font-size:0.74rem;gap:8px}
  .rp-gap-seg{font-size:0.78rem}
  .rp-gap-true{font-size:0.66rem}
  .rp-gap-val{font-size:0.78rem}
  .rp-gap-track{height:16px;border-radius:8px}
}
footer{margin-top:36px;padding-top:20px;border-top:1px solid var(--border);font-size:0.75rem;color:var(--muted)}
</style>
</head>
<body>
<a class="rp-brand-bar" href="https://alphapeak.io" target="_blank" rel="noopener">
  <img src="${ogImg}" alt="AlphaPeak" width="160" height="36" loading="eager" decoding="async">
  <span class="rp-brand-text">
    <span class="rp-brand-name">Pace Lab</span>
    <span class="rp-brand-tag">by AlphaPeak</span>
  </span>
</a>
<h1>${escapeHtml(athleteLabel || 'Pacing report')}</h1>
<p class="rp-meta">${escapeHtml(eventName)} · ${escapeHtml(genderLabel)} · ${escapeHtml(generatedAt)}</p>
${anchorStripHtml ? `<p class="rp-anchor-strip">${anchorStripHtml}</p>` : ''}
<div class="rp-grid">
  <div class="rp-card"><div class="k">Total (analysis)</div><div class="v">${escapeHtml(totalDisplay)}</div></div>
  <div class="rp-card"><div class="k">Model tier</div><div class="v">${escapeHtml(modelTier)}</div></div>
  <div class="rp-card"><div class="k">Half differential</div><div class="v">${escapeHtml(diffDisplay)}</div></div>
  <div class="rp-card"><div class="k">Shape</div><div class="v">${escapeHtml(shapeDisplay)}</div></div>
  <div class="rp-card"><div class="k">First half %</div><div class="v">${escapeHtml(firstHalfPctDisplay)}</div></div>
</div>
<div class="rp-section">
  <h2>Gap vs reference</h2>
  <div class="rp-gaps" id="rp-gaps">${gapBarsInnerHtml}</div>
</div>
${chartSectionHtml}
<div class="rp-section">
  <h2>Segment table</h2>
  <div class="rp-table-wrap">
    <table><thead><tr><th>Segment</th><th>You (s)</th><th>Ref (s)</th><th>Gap (s)</th><th>% you</th><th>% ref</th></tr></thead><tbody id="rp-table-body">${tableInnerHtml}</tbody></table>
  </div>
</div>
<footer>Shared from Pace Lab · Timing is from video marks, not photo-finish. pace.alphapeak.io</footer>
${chartBootHtml}
</body>
</html>`;
}

export function buildGapBarsInnerHtml(gaps, maxAbsGap) {
  const cap = Math.max(maxAbsGap, 0.001);
  return gaps
    .map(g => {
      const gap = g.gap;
      const halfPct = Math.min(50, (Math.abs(gap) / cap) * 50);
      const w = `${halfPct}%`;
      const sign = gap > 0 ? '+' : '';
      const barStyle =
        gap >= 0
          ? `left:50%;width:${w};background:var(--red)`
          : `right:50%;width:${w};background:var(--green)`;
      return `<div class="rp-gap">
        <div class="rp-gap-head">
          <span class="rp-gap-seg">${escapeHtml(g.segment)}</span>
          <span class="rp-gap-true">you ${g.actual.toFixed(3)}s · ref ${g.model.toFixed(3)}s</span>
          <span class="rp-gap-val">${sign}${gap.toFixed(3)}s</span>
        </div>
        <div class="rp-gap-track"><span class="rp-gap-mid"></span><span class="rp-gap-bar" style="${barStyle}"></span></div>
      </div>`;
    })
    .join('');
}

export function buildReportTableRowsHtml(gaps, yourTotalSec, refTotalSec) {
  const yT = yourTotalSec ?? gaps.reduce((s, g) => s + g.actual, 0);
  const rT = refTotalSec ?? yT;
  let yCum = 0;
  let rCum = 0;
  return gaps
    .map(g => {
      yCum += g.actual;
      rCum += g.model;
      const py = ((g.actual / yT) * 100).toFixed(1);
      const pm = ((g.model / rT) * 100).toFixed(1);
      return `<tr>
      <td>${escapeHtml(g.segment)}</td>
      <td class="mono">${g.actual.toFixed(3)}<br><span class="rp-cum mono">Σ ${yCum.toFixed(3)}</span></td>
      <td class="mono">${g.model.toFixed(3)}<br><span class="rp-cum mono">Σ ${rCum.toFixed(3)}</span></td>
      <td class="mono">${g.gap > 0 ? '+' : ''}${g.gap.toFixed(3)}</td>
      <td class="mono">${py}% <span class="pct-sec">(${g.actual.toFixed(3)}s of ${yT.toFixed(3)}s)</span></td>
      <td class="mono">${pm}% <span class="pct-sec">(${g.model.toFixed(3)}s of ${rT.toFixed(3)}s)</span></td>
    </tr>`;
    })
    .join('');
}
